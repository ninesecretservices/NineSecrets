import api from './api';

// Fetches the invoice PDF (auth'd via the same Bearer interceptor as every
// other request) and saves it — a plain <a href> can't carry the auth header,
// so the file has to come down as a blob first.
export async function downloadInvoice(order) {
  const res = await api.post(
    '/order/invoice',
    { id: order._id },
    { responseType: 'blob' }
  );
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${order.orderNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
