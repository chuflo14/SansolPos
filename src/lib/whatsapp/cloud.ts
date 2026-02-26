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

const throwMetaApiError = (errorPayload: MetaApiErrorPayload | undefined, fallbackMessage: string) => {
    const message = errorPayload?.message || fallbackMessage;
    const error = new Error(message) as Error & {
        metaCode?: number;
        metaType?: string;
        metaSubcode?: number;
        metaTrace?: string;
    };

    error.metaCode = errorPayload?.code;
    error.metaType = errorPayload?.type;
    error.metaSubcode = errorPayload?.error_subcode;
    error.metaTrace = errorPayload?.fbtrace_id;

    throw error;
};

const DEFAULT_GRAPH_API_VERSION = 'v22.0';

const sanitizePhone = (phone: string) => phone.replace(/[^0-9]/g, '');

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

        const uploadResponse = await fetch(`https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/media`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            body: form
        });

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

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        throwMetaApiError(
            responseData?.error,
            'WhatsApp Cloud API request failed'
        );
    }

    return responseData;
}
