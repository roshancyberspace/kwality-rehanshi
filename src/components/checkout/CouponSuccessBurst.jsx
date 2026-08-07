const PARTICLE_DIRECTIONS = [
  { tx: '0px', ty: '-78px' },
  { tx: '52px', ty: '-58px' },
  { tx: '-48px', ty: '-62px' },
  { tx: '68px', ty: '-18px' },
  { tx: '-64px', ty: '-22px' },
  { tx: '24px', ty: '-84px' },
]

const PARTICLE_COLORS = ['#67B529', '#6338E0', '#FFD166', '#06D6A0', '#EF476F', '#118AB2']

function CouponSuccessBurst() {
  return (
    <div aria-hidden="true" className="coupon-success-burst pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {PARTICLE_COLORS.map((color, index) => (
        <span
          key={color}
          className="coupon-confetti-particle"
          style={{
            '--particle-delay': `${index * 45}ms`,
            '--tx': PARTICLE_DIRECTIONS[index]?.tx || '0px',
            '--ty': PARTICLE_DIRECTIONS[index]?.ty || '-70px',
            background: color,
          }}
        />
      ))}
      <div className="absolute inset-0 grid place-items-center">
        <div className="coupon-success-check">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default CouponSuccessBurst
