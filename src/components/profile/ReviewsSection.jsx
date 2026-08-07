import { useState } from 'react'

const defaultReview = {
  orderId: '',
  rating: '5',
  service: '',
  text: '',
}

function ReviewsSection({ onAddReview, orders = [], reviews }) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [reviewForm, setReviewForm] = useState(defaultReview)
  const getOrderReview = (order) => {
    const metadataReview = order.metadata?.reviews?.customer_to_vendor
    if (metadataReview) return metadataReview
    return reviews.find((review) => String(review.orderId || '') === String(order.id) || (!review.orderId && review.service === order.service))
  }
  const reviewedOrders = orders.filter((order) => getOrderReview(order))
  const reviewableOrders = orders.filter((order) => !getOrderReview(order))
  const canSubmit = reviewForm.orderId && reviewForm.text.trim()

  const updateReviewForm = (field, value) => {
    setReviewForm((current) => ({ ...current, [field]: value }))
  }

  const submitReview = async () => {
    if (!canSubmit) return
    await onAddReview?.(reviewForm)
    setReviewForm(defaultReview)
    setIsReviewModalOpen(false)
  }

  return (
    <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Reviews</h2>
        {reviewableOrders.length > 0 ? (
          <button
            className="rounded-md border border-blue-200 px-4 py-2 text-sm font-bold hover:bg-blue-50"
            onClick={() => setIsReviewModalOpen(true)}
            type="button"
          >
            + Add review
          </button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {reviewedOrders.map((order) => {
          const review = getOrderReview(order)
          const rating = typeof review === 'object' ? review.rating : ''
          const roundedRating = Math.round(Number(rating) || 0)
          return (
          <article className="rounded-lg bg-[#F6FBFF] p-4" key={order.id}>
            <p className="font-bold">{order.service}</p>
            <p className="mt-1 text-xs font-semibold text-blue-700">{order.id}</p>
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-black text-amber-700 hover:bg-amber-50"
              onClick={() => setSelectedReview({ order, review })}
              type="button"
            >
              <span className="text-amber-500">{roundedRating ? '★'.repeat(Math.min(5, roundedRating)) : '★'}</span>
              <span>Your rating: {rating || 'Submitted'} star</span>
            </button>
          </article>
          )
        })}
        {!reviewedOrders.length && <p className="text-sm font-semibold text-blue-700">No completed order review submitted yet.</p>}
      </div>

      {isReviewModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#003F86]/45 p-4 animate-modal-fade">
          <div className="w-full max-w-xl rounded-lg bg-white p-4 shadow-2xl animate-modal-slide lg:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">Add review</h3>
                <p className="mt-1 text-sm text-blue-700">Share feedback for a completed service.</p>
              </div>
              <button className="rounded-full border border-blue-200 px-3 py-1 text-lg font-black" onClick={() => setIsReviewModalOpen(false)} type="button">
                x
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              <select
                className="rounded-md border border-blue-200 px-4 py-3 outline-none focus:border-[#003F86]"
                onChange={(event) => updateReviewForm('orderId', event.target.value)}
                value={reviewForm.orderId}
              >
                <option value="">Select booking</option>
                {reviewableOrders.map((order) => (
                  <option key={order.id} value={order.id}>{order.service} - {order.id}</option>
                ))}
              </select>
              <select
                className="rounded-md border border-blue-200 px-4 py-3 outline-none focus:border-[#003F86]"
                onChange={(event) => updateReviewForm('rating', event.target.value)}
                value={reviewForm.rating}
              >
                <option value="5">5.0 rating</option>
                <option value="4.5">4.5 rating</option>
                <option value="4">4.0 rating</option>
                <option value="3.5">3.5 rating</option>
              </select>
              <textarea
                className="min-h-28 rounded-md border border-blue-200 px-4 py-3 outline-none focus:border-[#003F86]"
                onChange={(event) => updateReviewForm('text', event.target.value)}
                placeholder="Write your service experience"
                value={reviewForm.text}
              />
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-md border border-blue-200 px-5 py-3 text-sm font-bold hover:bg-blue-50" onClick={() => setIsReviewModalOpen(false)} type="button">
                Cancel
              </button>
              <button
                className="rounded-md bg-[#003F86] px-5 py-3 text-sm font-bold text-white disabled:bg-blue-100"
                disabled={!canSubmit}
                onClick={submitReview}
                type="button"
              >
                Submit review
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {selectedReview ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#003F86]/45 p-4 animate-modal-fade">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-2xl animate-modal-slide lg:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">Customer feedback</h3>
                <p className="mt-1 text-sm font-semibold text-blue-700">{selectedReview.order.service} | {selectedReview.order.id}</p>
              </div>
              <button className="rounded-full border border-blue-200 px-3 py-1 text-lg font-black hover:bg-blue-50" onClick={() => setSelectedReview(null)} type="button">
                x
              </button>
            </div>
            <div className="mt-5 rounded-lg bg-[#F6FBFF] p-4">
              <p className="text-sm font-black text-amber-600">{'★'.repeat(Math.min(5, Math.round(Number(selectedReview.review?.rating) || 0)))} <span className="text-[#003F86]">{selectedReview.review?.rating || 'Submitted'} star</span></p>
              <p className="mt-3 text-sm font-semibold leading-6 text-blue-900">{selectedReview.review?.text || selectedReview.review?.feedback || 'Feedback text not available.'}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ReviewsSection
