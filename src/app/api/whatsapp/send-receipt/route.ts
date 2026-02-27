import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasWhatsAppCloudConfig, sendWhatsAppReceipt } from '@/lib/whatsapp/cloud';

type RequestBody = {
    to?: string;
    message?: string;
    receiptUrl?: string;
    receiptBase64?: string;
    receiptMimeType?: string;
};

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { code: 'UNAUTHORIZED', error: 'No autenticado.' },
                { status: 401 }
            );
        }

        if (!hasWhatsAppCloudConfig()) {
            return NextResponse.json(
                { code: 'WHATSAPP_CLOUD_NOT_CONFIGURED', error: 'WhatsApp Cloud no está configurado en el servidor.' },
                { status: 503 }
            );
        }

        const body = await request.json() as RequestBody;
        const to = body.to?.trim();
        const message = body.message?.trim();
        const receiptUrl = body.receiptUrl?.trim();
        const receiptBase64 = body.receiptBase64;
        const receiptMimeType = body.receiptMimeType?.trim();

        if (!to || !message) {
            return NextResponse.json(
                { code: 'BAD_REQUEST', error: 'Faltan campos requeridos: to, message.' },
                { status: 400 }
            );
        }

        const providerResponse = await sendWhatsAppReceipt({
            to,
            message,
            receiptUrl,
            receiptBase64,
            receiptMimeType
        });

        return NextResponse.json(
            { ok: true, providerResponse },
            { status: 200 }
        );
    } catch (error: any) {
        const message = error?.message || 'Error enviando comprobante por WhatsApp Cloud.';
        const metaCode = error?.metaCode as number | undefined;
        const metaType = error?.metaType as string | undefined;
        const metaSubcode = error?.metaSubcode as number | undefined;
        const metaTrace = error?.metaTrace as string | undefined;
        const internalCode = error?.code as string | undefined;

        let code = 'WHATSAPP_SEND_FAILED';
        let status = 500;

        if (message === 'INVALID_PHONE_NUMBER') {
            code = 'INVALID_PHONE_NUMBER';
            status = 400;
        } else if (message === 'INVALID_RECEIPT_MEDIA') {
            code = 'INVALID_RECEIPT_MEDIA';
            status = 400;
        } else if (internalCode === 'WHATSAPP_TIMEOUT') {
            code = 'WHATSAPP_TIMEOUT';
            status = 504;
        } else if (metaCode === 190 || /authentication error/i.test(message) || /oauth/i.test(message)) {
            code = 'WHATSAPP_AUTH_ERROR';
            status = 401;
        }

        return NextResponse.json(
            {
                code,
                error: message,
                details: {
                    metaCode,
                    metaType,
                    metaSubcode,
                    metaTrace
                }
            },
            { status }
        );
    }
}
