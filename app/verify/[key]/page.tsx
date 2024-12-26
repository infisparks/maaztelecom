"use client"
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { database } from '../../../lib/firebaseConfig'
import { ref, get } from 'firebase/database'

const VerifyPage: React.FC = () => {
  const router = useRouter()
  const { key } = router.query
  const [saleData, setSaleData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!key) return

    const fetchSaleData = async () => {
      try {
        const saleRef = ref(database, `sell/${key}`)
        const snapshot = await get(saleRef)
        if (snapshot.exists()) {
          setSaleData(snapshot.val())
        } else {
          setError('No sale found with the provided key.')
        }
      } catch (err) {
        console.error('Error fetching sale data:', err)
        setError('Failed to fetch sale data.')
      } finally {
        setLoading(false)
      }
    }

    fetchSaleData()
  }, [key])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="max-w-lg w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Sale Verification</h1>
        <p className="mb-2"><strong>Name:</strong> {saleData.username}</p>
        <p className="mb-2"><strong>Phone Number:</strong> {saleData.phoneNumber}</p>
        <p className="mb-2"><strong>Payment Method:</strong> {saleData.paymentMethod}</p>
        <p className="mb-4"><strong>Date:</strong> {new Date(saleData.timestamp).toLocaleDateString()}</p>
        <h2 className="text-xl font-semibold mb-2">Products:</h2>
        <ul className="list-disc list-inside mb-4">
          {saleData.products.map((prod: any, index: number) => (
            <li key={index}>
              {prod.productId} - ₹{prod.price.toFixed(2)}
            </li>
          ))}
        </ul>
        <p className="mb-1"><strong>Subtotal:</strong> ₹{saleData.products.reduce((acc: number, curr: any) => acc + curr.price, 0).toFixed(2)}</p>
        <p className="mb-1"><strong>Discount:</strong> ₹{saleData.discount.toFixed(2)}</p>
        <p className="mb-4"><strong>Total:</strong> ₹{(saleData.products.reduce((acc: number, curr: any) => acc + curr.price, 0) - saleData.discount).toFixed(2)}</p>
        <p className="text-green-600 font-semibold">This sale has been verified successfully!</p>
      </div>
    </div>
  )
}

export default VerifyPage
