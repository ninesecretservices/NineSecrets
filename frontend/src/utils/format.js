// Consistent INR formatting: ₹1,099
export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const FREE_SHIPPING_THRESHOLD = 599;
