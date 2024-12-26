// components/Bill.tsx

import React from 'react';

interface BillProps {
  saleData: {
    username: string;
    phoneNumber: string;
    products: { productId: string; price: number }[];
    discount: number;
    timestamp: string;
  };
  productsList: { id: string; name: string }[];
}

const Bill: React.FC<BillProps> = ({ saleData, productsList }) => {
  const getProductNameById = (id: string): string => {
    const product = productsList.find((p) => p.id === id);
    return product ? product.name : 'Unknown Product';
  };

  const formattedDate = new Date(saleData.timestamp).toLocaleString();

  const subtotal = saleData.products.reduce((acc, curr) => acc + curr.price, 0);
  const discountAmount = saleData.discount || 0;
  const total = subtotal - discountAmount;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Invoice</h1>
          <p className="text-lg font-bold">Date: {formattedDate}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">Name: {saleData.username}</p>
          <p className="text-lg font-bold">Phone: {saleData.phoneNumber}</p>
        </div>
      </div>

      {/* Products Table */}
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="py-2 border-b">#</th>
            <th className="py-2 border-b">Product</th>
            <th className="py-2 border-b text-right">Price (₹)</th>
          </tr>
        </thead>
        <tbody>
          {saleData.products.map((prod, index) => (
            <tr key={index}>
              <td className="py-2 border-b">{index + 1}</td>
              <td className="py-2 border-b">{getProductNameById(prod.productId)}</td>
              <td className="py-2 border-b text-right">{prod.price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="mt-6">
        <div className="flex justify-between mb-2">
          <span className="font-medium">Subtotal:</span>
          <span className="font-medium">₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="font-medium">Discount:</span>
          <span className="font-medium">₹{discountAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mt-4">
          <span className="font-bold text-red-600">Total:</span>
          <span className="font-bold text-red-600">₹{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default Bill;
