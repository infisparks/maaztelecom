// pages/dashboard.tsx

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { database } from '@/lib/firebaseConfig'
import { ref, onValue, DataSnapshot, remove, ref as dbRef } from 'firebase/database'
import { format, parseISO, isSameDay } from 'date-fns'
import { FaBox, FaShoppingCart, FaSearch, FaCalendarAlt, FaTimes, FaTrash } from 'react-icons/fa'

interface Product {
  id: string
  createdAt: string
  name: string
  price: number
  warranty: {
    hasWarranty: boolean
    months: number
  }
}

interface SaleProduct {
  price: number
  productId: string
  discountPrice?: number
  productName?: string
  warranty?: {
    hasWarranty: boolean
    months: number
  }
}

interface Sale {
  id: string
  discount?: number // Discount percentage
  paymentMethod?: string
  phoneNumber: string
  products: SaleProduct[]
  timestamp: string | number
  username: string
  invoiceURL?: string
}

const Dashboard: React.FC = () => {
  // State Management
  const [activeTab, setActiveTab] = useState<'products' | 'sales'>('products')

  // Products State
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState<string>('')
  const [productDate, setProductDate] = useState<Date | null>(null)

  // Sales State
  const [sales, setSales] = useState<Sale[]>([])
  const [saleSearch, setSaleSearch] = useState<string>('')
  const [saleDate, setSaleDate] = useState<Date | null>(null)

  // Fetch Products from Firebase
  useEffect(() => {
    const productsRef = ref(database, 'products')
    const unsubscribe = onValue(productsRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as Record<string, Omit<Product, 'id'>>
      if (data) {
        const fetchedProducts: Product[] = Object.entries(data).map(([id, product]) => ({
          id,
          createdAt: product.createdAt,
          name: product.name,
          price: product.price,
          warranty: product.warranty,
        }))
        setProducts(fetchedProducts)
      } else {
        setProducts([])
      }
    })

    return () => unsubscribe()
  }, [])

  // Fetch Sales from Firebase
  useEffect(() => {
    const salesRef = ref(database, 'sell')
    const unsubscribe = onValue(salesRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as Record<string, Omit<Sale, 'id'>>
      if (data) {
        const fetchedSales: Sale[] = Object.entries(data).map(([id, sale]) => ({
          id,
          discount: sale.discount,
          paymentMethod: sale.paymentMethod,
          phoneNumber: sale.phoneNumber,
          products: sale.products,
          timestamp: sale.timestamp,
          username: sale.username,
          invoiceURL: sale.invoiceURL,
        }))
        setSales(fetchedSales)
      } else {
        setSales([])
      }
    })

    return () => unsubscribe()
  }, [])

  // Delete Product Function
  const deleteProduct = async (productId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this product?')
    if (!confirmDelete) return

    try {
      const productRef = dbRef(database, `products/${productId}`)
      await remove(productRef)
      alert('Product deleted successfully.')
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product. Please try again.')
    }
  }

  // Delete Sale Function
  const deleteSale = async (saleId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this sale record?')
    if (!confirmDelete) return

    try {
      const saleRef = dbRef(database, `sell/${saleId}`)
      await remove(saleRef)
      alert('Sale record deleted successfully.')
    } catch (error) {
      console.error('Error deleting sale:', error)
      alert('Failed to delete sale record. Please try again.')
    }
  }

  // Filtered Products based on search and date
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase())
      const matchesDate = productDate ? isSameDay(parseISO(product.createdAt), productDate) : true
      return matchesSearch && matchesDate
    })
  }, [products, productSearch, productDate])

  // Filtered Sales based on search and date
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch =
        sale.username.toLowerCase().includes(saleSearch.toLowerCase()) ||
        sale.phoneNumber.includes(saleSearch) ||
        sale.products.some((prod) =>
          prod.productName
            ? prod.productName.toLowerCase().includes(saleSearch.toLowerCase())
            : false
        )
      const saleDateParsed =
        typeof sale.timestamp === 'string' ? parseISO(sale.timestamp) : new Date(sale.timestamp)
      const matchesDate = saleDate ? isSameDay(saleDateParsed, saleDate) : true
      return matchesSearch && matchesDate
    })
  }, [sales, saleSearch, saleDate])

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl p-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-center mb-8 text-black">Professional Dashboard</h1>

        {/* Tabs */}
        <div className="flex mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center px-4 py-2 mr-4 rounded-t-lg ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-black hover:bg-gray-300'
            } transition-colors duration-300`}
          >
            <FaBox className="mr-2" />
            Products
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center px-4 py-2 rounded-t-lg ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-black hover:bg-gray-300'
            } transition-colors duration-300`}
          >
            <FaShoppingCart className="mr-2" />
            Sales
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'products' ? (
            // Products Section
            <div>
              {/* Search and Date Filter */}
              <div className="flex flex-col md:flex-row items-center mb-4">
                {/* Search Bar */}
                <div className="flex items-center mb-2 md:mb-0 md:mr-4 w-full md:w-1/2">
                  <FaSearch className="text-gray-500 mr-2" />
                  <input
                    type="text"
                    placeholder="Search Products by Name"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                {/* Date Picker */}
                <div className="flex items-center w-full md:w-1/2">
                  <FaCalendarAlt className="text-gray-500 mr-2" />
                  <input
                    type="date"
                    value={productDate ? format(productDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) =>
                      setProductDate(e.target.value ? new Date(e.target.value) : null)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                  {productDate && (
                    <button
                      onClick={() => setProductDate(null)}
                      className="ml-2 text-red-500 hover:text-red-700"
                      title="Clear Date Filter"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      {/* Removed ID Column */}
                      <th className="px-4 py-2 border-b text-left text-black">Name</th>
                      <th className="px-4 py-2 border-b text-left text-black">Price (Rs)</th>
                      <th className="px-4 py-2 border-b text-left text-black">Warranty</th>
                      <th className="px-4 py-2 border-b text-left text-black">Created At</th>
                      <th className="px-4 py-2 border-b text-left text-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-black">
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-100">
                          {/* Removed ID Cell */}
                          <td className="px-4 py-2 border-b text-sm text-black">{product.name}</td>
                          <td className="px-4 py-2 border-b text-sm text-black">
                            ₹{product.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 border-b text-sm text-black">
                            {product.warranty.hasWarranty
                              ? `${product.warranty.months} months`
                              : 'No Warranty'}
                          </td>
                          <td className="px-4 py-2 border-b text-sm text-black">
                            {format(parseISO(product.createdAt), 'dd MMM yyyy')}
                          </td>
                          <td className="px-4 py-2 border-b text-sm text-black">
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete Product"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Sales Section
            <div>
              {/* Search and Date Filter */}
              <div className="flex flex-col md:flex-row items-center mb-4">
                {/* Search Bar */}
                <div className="flex items-center mb-2 md:mb-0 md:mr-4 w-full md:w-1/2">
                  <FaSearch className="text-gray-500 mr-2" />
                  <input
                    type="text"
                    placeholder="Search Sales by Username, Phone, or Product"
                    value={saleSearch}
                    onChange={(e) => setSaleSearch(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                {/* Date Picker */}
                <div className="flex items-center w-full md:w-1/2">
                  <FaCalendarAlt className="text-gray-500 mr-2" />
                  <input
                    type="date"
                    value={saleDate ? format(saleDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) =>
                      setSaleDate(e.target.value ? new Date(e.target.value) : null)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                  {saleDate && (
                    <button
                      onClick={() => setSaleDate(null)}
                      className="ml-2 text-red-500 hover:text-red-700"
                      title="Clear Date Filter"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>

              {/* Sales Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      {/* Removed ID Column */}
                      <th className="px-4 py-2 border-b text-left text-black">Username</th>
                      <th className="px-4 py-2 border-b text-left text-black">Phone Number</th>
                      <th className="px-4 py-2 border-b text-left text-black">Products</th>
                      <th className="px-4 py-2 border-b text-left text-black">Discount (Rs)</th>
                      <th className="px-4 py-2 border-b text-left text-black">Total Price (Rs)</th>
                      <th className="px-4 py-2 border-b text-left text-black">Payment Method</th>
                      <th className="px-4 py-2 border-b text-left text-black">Timestamp</th>
                      <th className="px-4 py-2 border-b text-left text-black">Actions</th>
                      {/* Removed Invoice Column */}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-black">
                          No sales found.
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale) => {
                        const originalTotal = sale.products.reduce(
                          (acc, prod) => acc + prod.price,
                          0
                        )
                        const discountedTotal = sale.products.reduce(
                          (acc, prod) => acc + (prod.discountPrice ?? prod.price),
                          0
                        )
                        const discountAmount = originalTotal - discountedTotal

                        // If there's an additional discount percentage
                        let finalTotal = discountedTotal
                        let additionalDiscount = 0
                        if (sale.discount) {
                          additionalDiscount = (sale.discount / 100) * discountedTotal
                          finalTotal -= additionalDiscount
                        }

                        const totalDiscount = discountAmount + additionalDiscount

                        return (
                          <tr key={sale.id} className="hover:bg-gray-100">
                            {/* Removed ID Cell */}
                            <td className="px-4 py-2 border-b text-sm text-black">
                              {sale.username}
                            </td>
                            <td className="px-4 py-2 border-b text-sm text-black">
                              {sale.phoneNumber}
                            </td>
                            <td className="px-4 py-2 border-b text-sm text-black">
                              <ul className="list-disc list-inside">
                                {sale.products.map((prod, idx) => (
                                  <li key={idx}>
                                    {prod.productName ? prod.productName : 'Product'} - ₹
                                    {prod.discountPrice
                                      ? `${prod.discountPrice.toFixed(2)} (Discounted)`
                                      : prod.price.toFixed(2)}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-4 py-2 border-b text-sm text-black">
                              ₹{totalDiscount.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 border-b text-sm text-black">
                              ₹{finalTotal.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 border-b text-sm text-black">
                              {sale.paymentMethod ? sale.paymentMethod : 'N/A'}
                            </td>
                            <td className="px-4 py-2 border-b text-sm text-black">
                              {typeof sale.timestamp === 'string'
                                ? format(parseISO(sale.timestamp), 'dd MMM yyyy HH:mm:ss')
                                : format(new Date(sale.timestamp), 'dd MMM yyyy HH:mm:ss')}
                            </td>
                            <td className="px-4 py-2 border-b text-sm text-black">
                              <button
                                onClick={() => deleteSale(sale.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Delete Sale Record"
                              >
                                <FaTrash />
                              </button>
                            </td>
                            {/* Removed Invoice Cell */}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
