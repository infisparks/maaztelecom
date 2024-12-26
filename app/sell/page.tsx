'use client'

import React, { useEffect, useState, useRef } from 'react'
import { database } from '../../lib/firebaseConfig'
import { ref as dbRef, push, get, DatabaseReference } from 'firebase/database'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import jsPDF from 'jspdf'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface Warranty {
  hasWarranty: boolean
  months: number
}

interface Product {
  id: string
  name: string
  price: number
  warranty?: Warranty
}

interface SaleProduct {
  id: string
  productName: string
  productId: string
  price: number
  showSuggestions: boolean
  suggestions: Product[]
}

type PaymentMethod = 'Cash' | 'Online'

const SellForm: React.FC = () => {
  const [username, setUsername] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [products, setProducts] = useState<Product[]>([])
  const [saleProducts, setSaleProducts] = useState<SaleProduct[]>([
    {
      id: uuidv4(),
      productName: '',
      productId: '',
      price: 0,
      showSuggestions: false,
      suggestions: [],
    },
  ])
  const [discount, setDiscount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [loading, setLoading] = useState<boolean>(false)
  const [productsLoading, setProductsLoading] = useState<boolean>(true)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const formRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const storage = getStorage()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = dbRef(database, 'products')
        const snapshot = await get(productsRef)
        if (snapshot.exists()) {
          const data = snapshot.val()
          const productsList: Product[] = Object.keys(data).map((key) => ({
            id: key,
            name: data[key].name,
            price: data[key].price,
            warranty: data[key].warranty ? data[key].warranty : undefined,
          }))
          setProducts(productsList)
        } else {
          setProducts([])
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        setErrorMessage('Failed to load products. Please try again later.')
      } finally {
        setProductsLoading(false)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setSaleProducts((prev) =>
          prev.map((product) => ({
            ...product,
            showSuggestions: false,
            suggestions: [],
          }))
        )
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleProductNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value
    setSaleProducts((prev) =>
      prev.map((product, i) =>
        i === index
          ? {
              ...product,
              productName: value,
              showSuggestions: true,
              suggestions:
                value.length > 0
                  ? products.filter((p) =>
                      p.name.toLowerCase().includes(value.toLowerCase())
                    )
                  : [],
            }
          : product
      )
    )
    setSaleProducts((prev) =>
      prev.map((product, i) =>
        i === index ? { ...product, productId: '', price: 0 } : product
      )
    )
  }

  const handleSelectSuggestion = (product: Product, index: number) => {
    setSaleProducts((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              productName: product.name,
              productId: product.id,
              price: product.price,
              showSuggestions: false,
              suggestions: [],
            }
          : p
      )
    )
  }

  const handlePriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = Number(e.target.value)
    setSaleProducts((prev) =>
      prev.map((product, i) =>
        i === index ? { ...product, price: value } : product
      )
    )
  }

  const addProductEntry = () => {
    setSaleProducts((prev) => [
      ...prev,
      {
        id: uuidv4(),
        productName: '',
        productId: '',
        price: 0,
        showSuggestions: false,
        suggestions: [],
      },
    ])
  }

  const removeProductEntry = (id: string) => {
    setSaleProducts((prev) => prev.filter((product) => product.id !== id))
  }

  const getImageBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result.toString())
        } else {
          reject('Failed to convert image to Base64.')
        }
      }
      reader.onerror = () => {
        reject('Failed to convert image to Base64.')
      }
      reader.readAsDataURL(blob)
    })
  }

  const createAndUploadPDF = async (saleData: any) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    try {
      const imageBase64 = await getImageBase64('/letterhead.png')
      doc.addImage(imageBase64, 'PNG', 0, 0, 210, 297)

      doc.setFontSize(16)
      doc.setTextColor(12, 29, 73)
      const leftMargin = 20
      const rightMargin = 190
      const topMargin = 50
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(17)
      doc.text(`Name: ${saleData.username}`, leftMargin, topMargin)
      doc.text(`Phone: ${saleData.phoneNumber}`, leftMargin, topMargin + 10)

      const currentDate = new Date(saleData.timestamp).toLocaleDateString()
      doc.text(`Date: ${currentDate}`, rightMargin - 60, topMargin)
      doc.text(
        `Payment Method: ${saleData.paymentMethod}`,
        rightMargin - 60,
        topMargin + 10
      )

      doc.setFontSize(16)
      let yPosition = topMargin + 30
      doc.setFont('Helvetica', 'bold')
      doc.setTextColor(12, 29, 73)
      doc.text('Product', 25, yPosition, { align: 'left' })
      doc.text('Price (₹)', 160, yPosition, { align: 'right' })
      doc.text('Warranty', 120, yPosition, { align: 'right' })

      yPosition += 5
      doc.setLineWidth(0.3)
      doc.line(leftMargin, yPosition, rightMargin, yPosition)
      yPosition += 10

      doc.setFont('Helvetica', 'normal')
      doc.setTextColor(12, 29, 73)
      saleData.products.forEach((prod: any, index: number) => {
        const productInfo = products.find((p) => p.id === prod.productId)
        const warrantyText =
          productInfo && productInfo.warranty && productInfo.warranty.hasWarranty
            ? `${productInfo.warranty.months} months`
            : 'N/A'
        doc.text(`${index + 1}. ${prod.productName}`, 25, yPosition, {
          align: 'left',
        })
        doc.text(`${prod.price.toFixed(2)}`, 160, yPosition, { align: 'right' })
        doc.text(`${warrantyText}`, 120, yPosition, { align: 'right' })
        yPosition += 10
      })

      const subtotal = saleData.products.reduce(
        (acc: number, curr: any) => acc + curr.price,
        0
      )
      const discountAmount = saleData.discount || 0
      const total = subtotal - discountAmount

      yPosition += 5
      doc.line(leftMargin, yPosition, rightMargin, yPosition)
      yPosition += 10

      doc.text('Subtotal:', 130, yPosition, { align: 'right' })
      doc.text(`${subtotal.toFixed(2)}`, 160, yPosition, { align: 'right' })
      yPosition += 10

      if (discountAmount > 0) {
        doc.text('Discount:', 130, yPosition, { align: 'right' })
        doc.text(`${discountAmount.toFixed(2)}`, 160, yPosition, {
          align: 'right',
        })
        yPosition += 10
      }

      doc.setFont('Helvetica', 'bold')
      doc.text('Total:', 130, yPosition, { align: 'right' })
      doc.text(`${total.toFixed(2)}`, 160, yPosition, { align: 'right' })

      yPosition += 20
      doc.setFontSize(12)
      doc.setFont('Helvetica', 'normal')
      doc.text('Thank you for your business!', 105, 280, { align: 'center' })

      // Convert PDF to blob
      const pdfBlob = doc.output('blob')
      const fileName = `Invoice_${new Date(saleData.timestamp)
        .toLocaleDateString()
        .replace(/\//g, '-')}.pdf`
      const pdfRef = storageRef(storage, `invoices/${fileName}`)

      // Upload PDF blob to Firebase Storage
      await uploadBytes(pdfRef, pdfBlob)
      const downloadURL = await getDownloadURL(pdfRef)

      return { downloadURL, fileName }
    } catch (error) {
      console.error('Error generating/uploading PDF:', error)
      toast.error('Failed to generate or upload PDF.')
      return null
    }
  }

  const sendWhatsAppMessage = (
    phoneNumber: string,
    message: string,
    mediaUrl: string,
    filename: string
  ) => {
    const fullNumber = `91${phoneNumber}`
    const apiUrl = `https://adrika.aknexus.in/api/send`
    const form = document.createElement('form')
    form.method = 'GET'
    form.action = apiUrl
    form.target = 'hidden_iframe'

    const params = {
      number: fullNumber,
      type: 'media',
      message,
      media_url: mediaUrl,
      filename,
      instance_id: '67278A2693C73',
      access_token: '67277e6184833',
    }

    Object.entries(params).forEach(([key, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value as string
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setErrorMessage('Username is required.')
      toast.error('Username is required.')
      return
    }

    if (!phoneNumber.trim()) {
      setErrorMessage('Phone number is required.')
      toast.error('Phone number is required.')
      return
    }

    const phoneRegex = /^[0-9]{10,15}$/
    if (!phoneRegex.test(phoneNumber)) {
      setErrorMessage('Please enter a valid phone number.')
      toast.error('Please enter a valid phone number.')
      return
    }

    if (!paymentMethod) {
      setErrorMessage('Please select a payment method.')
      toast.error('Please select a payment method.')
      return
    }

    for (let i = 0; i < saleProducts.length; i++) {
      const product = saleProducts[i]
      if (!product.productName.trim()) {
        setErrorMessage(`Product name is required for item ${i + 1}.`)
        toast.error(`Product name is required for item ${i + 1}.`)
        return
      }
      if (!product.productId) {
        setErrorMessage(`Please select a valid product for item ${i + 1}.`)
        toast.error(`Please select a valid product for item ${i + 1}.`)
        return
      }
      if (product.price <= 0) {
        setErrorMessage(`Price must be greater than zero for item ${i + 1}.`)
        toast.error(`Price must be greater than zero for item ${i + 1}.`)
        return
      }
    }

    const subtotal = saleProducts.reduce((acc, curr) => acc + curr.price, 0)

    if (discount < 0) {
      setErrorMessage('Discount cannot be negative.')
      toast.error('Discount cannot be negative.')
      return
    }
    if (discount > subtotal) {
      setErrorMessage('Discount cannot exceed the subtotal amount.')
      toast.error('Discount cannot exceed the subtotal amount.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const saleData = {
      username: username.trim(),
      phoneNumber: phoneNumber.trim(),
      paymentMethod,
      products: saleProducts.map((product) => {
        const productInfo = products.find((p) => p.id === product.productId)
        return {
          productId: product.productId,
          productName: product.productName,
          price: product.price,
          warranty: productInfo && productInfo.warranty ? productInfo.warranty : null,
        }
      }),
      discount: discount,
      timestamp: new Date().toISOString(),
    }

    try {
      const sellRef: DatabaseReference = dbRef(database, 'sell')
      const newSaleRef = await push(sellRef, saleData)
      const saleKey = newSaleRef.key

      if (!saleKey) {
        throw new Error('Failed to generate sale key.')
      }

      setSuccessMessage('Sale recorded successfully! Uploading PDF...')
      toast.success('Sale recorded successfully! Uploading PDF...')

      const pdfResult = await createAndUploadPDF(saleData)

      if (pdfResult && pdfResult.downloadURL) {
        sendWhatsAppMessage(
          phoneNumber,
          `Hello ${username}, here is your invoice.`,
          pdfResult.downloadURL,
          pdfResult.fileName
        )
      }

      setUsername('')
      setPhoneNumber('')
      setDiscount(0)
      setPaymentMethod('Cash')
      setSaleProducts([
        {
          id: uuidv4(),
          productName: '',
          productId: '',
          price: 0,
          showSuggestions: false,
          suggestions: [],
        },
      ])
      setSuccessMessage('PDF uploaded and WhatsApp message sent!')
      toast.success('PDF uploaded and WhatsApp message sent!')
    } catch (error) {
      console.error('Error recording sale:', error)
      setErrorMessage('Failed to record sale. Please try again.')
      toast.error('Failed to record sale. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <ToastContainer />
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-4xl font-bold text-black mb-8 text-center">Record a Sale</h1>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex flex-col md:flex-row md:space-x-4">
            <div className="flex-1">
              <label htmlFor="username" className="block text-lg font-medium text-black mb-2">
                Username<span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="flex-1 mt-4 md:mt-0">
              <label htmlFor="phoneNumber" className="block text-lg font-medium text-black mb-2">
                Phone Number<span className="text-red-500"> *</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                placeholder="Enter your phone number"
                required
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center">
            <div className="mt-6 md:mt-0">
              <label className="block text-lg font-medium text-black mb-2">
                Payment Method<span className="text-red-500"> *</span>
              </label>
              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash"
                    checked={paymentMethod === 'Cash'}
                    onChange={() => setPaymentMethod('Cash')}
                    className="form-radio h-5 w-5 text-indigo-600"
                    required
                  />
                  <span className="ml-2 text-lg text-black">Cash</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Online"
                    checked={paymentMethod === 'Online'}
                    onChange={() => setPaymentMethod('Online')}
                    className="form-radio h-5 w-5 text-indigo-600"
                    required
                  />
                  <span className="ml-2 text-lg text-black">Online</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-lg font-medium text-black mb-2">
              Products<span className="text-red-500"> *</span>
            </label>
            {saleProducts.map((product, index) => (
              <div key={product.id} className="flex items-start space-x-4 mb-6">
                <div className="w-full relative">
                  <input
                    type="text"
                    value={product.productName}
                    onChange={(e) => handleProductNameChange(e, index)}
                    onFocus={() =>
                      setSaleProducts((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, showSuggestions: true } : p
                        )
                      )
                    }
                    className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="Enter product name"
                    required
                  />
                  {product.showSuggestions && product.suggestions.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto text-black shadow-lg">
                      {product.suggestions.map((suggestion) => (
                        <li
                          key={suggestion.id}
                          onClick={() => handleSelectSuggestion(suggestion, index)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {suggestion.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="w-1/4">
                  <input
                    type="number"
                    value={product.price}
                    onChange={(e) => handlePriceChange(e, index)}
                    className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="Price (₹)"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                {saleProducts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProductEntry(product.id)}
                    className="text-red-500 hover:text-red-700 mt-2 text-2xl font-bold"
                    aria-label="Remove product"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addProductEntry}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300 flex items-center"
            >
              <span className="mr-2">Add Product</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div>
            <label htmlFor="discount" className="block text-lg font-medium text-black mb-2">
              Discount (₹)
            </label>
            <input
              type="number"
              id="discount"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-4 py-2 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
              placeholder="Enter discount amount"
              min="0"
              step="0.01"
            />
          </div>

          <button
            type="submit"
            className={`w-full flex justify-center items-center py-3 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300 ${
              loading || productsLoading || products.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : ''
            } text-lg`}
            disabled={loading || productsLoading || products.length === 0}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                Record Sale
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="ml-2 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>

          {successMessage && (
            <div className="mt-4 text-green-600 text-center text-lg">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 text-red-600 text-center text-lg">
              {errorMessage}
            </div>
          )}
        </form>

        <div className="mt-8 text-center">
          <Link href="/" className="text-indigo-600 hover:underline text-base flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Product Entry
          </Link>
        </div>
      </div>

      <iframe
        name="hidden_iframe"
        style={{ display: 'none' }}
        ref={iframeRef}
        title="Hidden iframe"
      ></iframe>
    </div>
  )
}

export default SellForm
