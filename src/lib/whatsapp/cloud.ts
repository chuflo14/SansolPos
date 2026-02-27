type SendWhatsAppReceiptParams = {
    to: string;
    message: string;
    receiptUrl?: string;
    receiptBase64?: string;
    receiptMimeType?: string;
};

type MetaApiErrorPayload = {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
};

type WhatsAppCloudError = Error & {
    code?: string;
    metaCode?: number;
    metaType?: string;
    metaSubcode?: number;
    metaTrace?: string;
    attemptedRecipients?: string[];
};

const throwMetaApiError = (errorPayload: MetaApiErrorPayload | undefined, fallbackMessage: string) => {
    const message = errorPayload?.message || fallbackMessage;
    const error = new Error(message) as WhatsAppCloudError;

    error.metaCode = errorPayload?.code;
    error.metaType = errorPayload?.type;
    error.metaSubcode = errorPayload?.error_subcode;
    error.metaTrace = errorPayload?.fbtrace_id;

    throw error;
};

const throwMetaApiErrorWithRecipients = (
    errorPayload: MetaApiErrorPayload | undefined,
    fallbackMessage: string,
    attemptedRecipients: string[]
) => {
    const error = new Error(errorPayload?.message || fallbackMessage) as WhatsAppCloudError;
    error.metaCode = errorPayload?.code;
    error.metaType = errorPayload?.type;
    error.metaSubcode = errorPayload?.error_subcode;
    error.metaTrace = errorPayload?.fbtrace_id;
    error.attemptedRecipients = attemptedRecipients;
    throw error;
};

const DEFAULT_GRAPH_API_VERSION = 'v22.0';
const CLOUD_UPLOAD_TIMEOUT_MS = 20000;
const CLOUD_SEND_TIMEOUT_MS = 20000;

const sanitizePhone = (phone: string) => {
    let digits = phone.replace(/[^0-9]/g, '');
    if (!digits) return '';

    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }

    // Canonicaliza formatos argentinos a E.164 móvil: 549 + area + número.
    if (digits.startsWith('549')) {
        return digits;
    }

    if (digits.startsWith('54')) {
        let national = digits.slice(2);
        if (national.startsWith('9')) {
            return `54${national}`;
        }

        national = national.replace(/^0/, '').replace(/^(\d{2,4})15/, '$1');
        return `549${national}`;
    }

    if (digits.startsWith('0')) {
        const national = digits.slice(1).replace(/^(\d{2,4})15/, '$1');
        return `549${national}`;
    }

    if (digits.length === 10) {
        return `549${digits}`;
    }

    return digits;
};

const buildRecipientCandidates = (phone: string) => {
    const candidates = new Set<string>();
    candidates.add(phone);

    // Meta test allow-list for AR can be stored as 54 + area + 15 + number.
    // If normalized input is 549..., try those legacy variants before failing.
    if (phone.startsWith('549')) {
        const national = phone.slice(3);
        if (national.length >= 9 && national.length <= 11) {
            // Try the most common AR split first (3-digit area), then alternatives.
            [3, 2, 4].forEach((areaLength) => {
                if (national.length > areaLength) {
                    const variant = `54${national.slice(0, areaLength)}15${national.slice(areaLength)}`;
                    candidates.add(variant);
                }
            });
        }
    }

    return Array.from(candidates);
};

const parseBase64Receipt = (input: string) => {
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
        return {
            mimeType: match[1],
            base64: match[2]
        };
    }

    return {
        mimeType: undefined,
        base64: input
    };
};

export const hasWhatsAppCloudConfig = () => {
    return Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID
    );
};

const createTimeoutError = (step: 'upload' | 'send') => {
    const error = new Error(
        step === 'upload'
            ? 'Tiempo de espera agotado al subir el comprobante a WhatsApp Cloud.'
            : 'Tiempo de espera agotado al enviar el mensaje a WhatsApp Cloud.'
    ) as WhatsAppCloudError;

    error.code = 'WHATSAPP_TIMEOUT';
    return error;
};

const fetchWithTimeout = async (
    url: string,
    init: RequestInit,
    timeoutMs: number,
    step: 'upload' | 'send'
) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal
        });
    } catch (error: any) {
        if (error?.name === 'AbortError') {
            throw createTimeoutError(step);
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

export async function sendWhatsAppReceipt({
    to,
    message,
    receiptUrl,
    receiptBase64,
    receiptMimeType
}: SendWhatsAppReceiptParams) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;

    if (!accessToken || !phoneNumberId) {
        throw new Error('WHATSAPP_CLOUD_NOT_CONFIGURED');
    }

    const sanitizedTo = sanitizePhone(to);
    if (!sanitizedTo) {
        throw new Error('INVALID_PHONE_NUMBER');
    }

    const endpoint = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;

    let mediaId: string | null = null;
    if (receiptBase64) {
        const parsed = parseBase64Receipt(receiptBase64);
        const mimeType = receiptMimeType || parsed.mimeType || 'image/png';
        const binary = Buffer.from(parsed.base64, 'base64');

        if (!binary.length) {
            throw new Error('INVALID_RECEIPT_MEDIA');
        }

        const form = new FormData();
        const extension = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('png') ? 'png' : 'bin';
        const file = new File([binary], `receipt.${extension}`, { type: mimeType });

        form.append('messaging_product', 'whatsapp');
        form.append('file', file);

        const uploadResponse = await fetchWithTimeout(
            `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/media`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                body: form
            },
            CLOUD_UPLOAD_TIMEOUT_MS,
            'upload'
        );

        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || !uploadData?.id) {
            throwMetaApiError(
                uploadData?.error,
                'No se pudo cargar el comprobante en WhatsApp Cloud.'
            );
        }

        mediaId = uploadData.id as string;
    }

    const payload = mediaId
        ? {
            messaging_product: 'whatsapp',
            to: sanitizedTo,
            type: 'image',
            image: {
                id: mediaId,
                caption: message.slice(0, 1024)
            }
        }
        : receiptUrl
        ? {
            messaging_product: 'whatsapp',
            to: sanitizedTo,
            type: 'image',
            image: {
                link: receiptUrl,
                caption: message.slice(0, 1024)
            }
        }
        : {
            messaging_product: 'whatsapp',
            to: sanitizedTo,
            type: 'text',
            text: {
                body: message.slice(0, 4096),
                preview_url: false
            }
        };
    const recipients = buildRecipientCandidates(sanitizedTo);
    let lastRecipientError: MetaApiErrorPayload | undefined;
    const attemptedRecipients: string[] = [];

    for (const recipient of recipients) {
        attemptedRecipients.push(recipient);

        const response = await fetchWithTimeout(
            endpoint,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    ...payload,
                    to: recipient
                })
            },
            CLOUD_SEND_TIMEOUT_MS,
            'send'
        );

        const responseData = await response.json().catch(() => ({}));

        if (response.ok) {
            return responseData;
        }

        const metaError = responseData?.error as MetaApiErrorPayload | undefined;
        lastRecipientError = metaError;

        const errorCode = String(metaError?.code ?? '');

        // Retry alternate AR variants on recipient-related errors.
        // 131030: not in allowed list (sandbox)
        // 131026: recipient number format invalid for this attempt
        if (errorCode === '131030' || errorCode === '131026') {
            continue;
        }

        throwMetaApiErrorWithRecipients(
            metaError,
            'WhatsApp Cloud API request failed',
            attemptedRecipients
        );
    }

    throwMetaApiErrorWithRecipients(
        lastRecipientError,
        'WhatsApp Cloud API request failed',
        attemptedRecipients
    );
}
