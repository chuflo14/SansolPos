import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export type ReceiptItem = {
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
};

export type ReceiptData = {
    storeName: string;
    businessName: string; // Razón Social
    cuit: string;
    address: string;
    date: string;
    receiptNumber: string;
    items: ReceiptItem[];
    total: number;
    paymentMethod: string;
    customerName?: string;
    customerPhone?: string;
    logoUrl?: string;
    qrUrl: string;
    legalFooter: string;
};

interface ReceiptProps {
    data: ReceiptData;
    format?: 'thermal' | 'a4';
}

export function Receipt({ data, format = 'thermal' }: ReceiptProps) {
    const isThermal = format === 'thermal';

    return (
        <div className={`bg-white text-black p-4 mx-auto ${isThermal ? 'w-80 font-mono text-sm' : 'w-[210mm] min-h-[297mm] p-8 font-sans'}`}>
            {/* Header */}
            <div className="text-center mb-6 border-b-2 border-dashed border-gray-400 pb-4">
                {data.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={data.logoUrl}
                        alt="Logo"
                        className={`mx-auto mb-3 object-contain ${isThermal ? 'h-16 max-w-[160px]' : 'h-24 max-w-[220px]'}`}
                    />
                )}
                <h1 className={`${isThermal ? 'text-xl' : 'text-3xl'} font-bold uppercase`}>{data.storeName}</h1>
                <p className="font-semibold">{data.businessName}</p>
                <p>CUIT: {data.cuit}</p>
                <p>{data.address}</p>
                <div className="mt-2 text-left">
                    <p><strong>Fecha:</strong> {new Date(data.date).toLocaleString('es-AR')}</p>
                    <p><strong>Nro. Comprobante:</strong> {data.receiptNumber}</p>
                </div>
            </div>

            {/* Items */}
            <div className="mb-6">
                <div className={`flex font-bold border-b border-gray-300 pb-2 mb-2 ${isThermal ? 'text-xs' : 'text-base'}`}>
                    <div className="flex-1">Cant. / Desc.</div>
                    <div className="w-20 text-right">Precio</div>
                    <div className="w-24 text-right">Subtotal</div>
                </div>
                {data.items.map((item, idx) => (
                    <div key={idx} className={`flex items-start mb-2 ${isThermal ? 'text-xs' : 'text-sm'}`}>
                        <div className="flex-1">
                            <span className="font-semibold">{item.quantity} x </span>
                            {item.name}
                        </div>
                        <div className="w-20 text-right">${item.unit_price.toFixed(2)}</div>
                        <div className="w-24 text-right">${item.subtotal.toFixed(2)}</div>
                    </div>
                ))}
            </div>

            {/* Totals & Payment */}
            <div className="border-t-2 border-dashed border-gray-400 pt-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className={`${isThermal ? 'text-lg' : 'text-2xl'} font-bold`}>TOTAL:</span>
                    <span className={`${isThermal ? 'text-xl' : 'text-3xl'} font-bold`}>${data.total.toFixed(2)}</span>
                </div>
                <p className={`${isThermal ? 'text-xs' : 'text-sm'}`}>
                    <strong>Método de Pago:</strong> {data.paymentMethod}
                </p>
                {data.customerName && (
                    <p className={`${isThermal ? 'text-xs' : 'text-sm'}`}>
                        <strong>Cliente:</strong> {data.customerName}
                    </p>
                )}
                {data.customerPhone && (
                    <p className={`${isThermal ? 'text-xs' : 'text-sm'}`}>
                        <strong>Tel:</strong> {data.customerPhone}
                    </p>
                )}
            </div>

            {/* Footer & QR */}
            <div className="text-center mt-6 flex flex-col items-center">
                <QRCodeSVG value={data.qrUrl} size={isThermal ? 120 : 150} className="mb-4" />
                <p className={`text-center text-gray-600 ${isThermal ? 'text-[10px]' : 'text-xs'}`}>
                    {data.legalFooter}
                </p>
            </div>
        </div>
    );
}
