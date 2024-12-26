// pages/index.tsx
"use client"
import { useState } from 'react';
import { database } from '../../lib/firebaseConfig';
import { ref, push } from 'firebase/database';

const ProductForm: React.FC = () => {
  const [productName, setProductName] = useState<string>('');
  const [productPrice, setProductPrice] = useState<number>(0);
  const [hasWarranty, setHasWarranty] = useState<boolean>(false);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!productName.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }

    if (productPrice <= 0) {
      setErrorMessage('Product price must be greater than zero.');
      return;
    }

    if (hasWarranty && warrantyMonths <= 0) {
      setErrorMessage('Warranty months must be greater than zero.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const productData = {
      name: productName.trim(),
      price: productPrice,
      warranty: hasWarranty
        ? { hasWarranty: true, months: warrantyMonths }
        : { hasWarranty: false },
      createdAt: new Date().toISOString(),
    };

    try {
      // Push data to 'products' node in Realtime Database
      const productsRef = ref(database, 'products');
      await push(productsRef, productData);

      setSuccessMessage('Product added successfully!');
      // Reset form
      setProductName('');
      setProductPrice(0);
      setHasWarranty(false);
      setWarrantyMonths(0);
    } catch (error) {
      console.error('Error adding product:', error);
      setErrorMessage('Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Add New Product</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div>
            <label htmlFor="productName" className="block text-gray-700 font-medium mb-2">
              Product Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-4 py-2 border text-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter product name"
              required
            />
          </div>

          {/* Product Price */}
          <div>
            <label htmlFor="productPrice" className="block text-gray-700 font-medium mb-2">
              Product Price<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="productPrice"
              value={productPrice}
              onChange={(e) => setProductPrice(Number(e.target.value))}
              className="w-full px-4 text-black py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter product price"
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* Warranty Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasWarranty"
              checked={hasWarranty}
              onChange={(e) => setHasWarranty(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded"
            />
            <label htmlFor="hasWarranty" className="ml-2 block text-gray-700 font-medium">
              Warranty Available
            </label>
          </div>

          {/* Warranty Months (Conditional) */}
          {hasWarranty && (
            <div>
              <label htmlFor="warrantyMonths" className="block text-gray-700 font-medium mb-2">
                Warranty Duration (Months)<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="warrantyMonths"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter number of months"
                required={hasWarranty}
                min="1"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white ${
              loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Add Product'}
          </button>

          {/* Success & Error Messages */}
          {successMessage && (
            <div className="mt-4 text-green-600 text-center">{successMessage}</div>
          )}
          {errorMessage && <div className="mt-4 text-red-600 text-center">{errorMessage}</div>}
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
