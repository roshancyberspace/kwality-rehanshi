import { useEffect, useState } from 'react'
import { useGooglePlaces } from '../../hooks/useGooglePlaces'
import { useBodyScrollLock } from '../../utils/modalScrollLock'

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  )
}

function InputPinIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function LocateIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" fill="currentColor" r="2.3" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" fill="currentColor" opacity="0.14" />
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
    </svg>
  )
}

function LocationModal({ currentLocation, onClose, onLocationSelect }) {
  useBodyScrollLock(true)
  const isPlaceholderLocation = ['Use current location', 'Detecting location...', 'Location not detected'].includes(currentLocation)
  const [query, setQuery] = useState(isPlaceholderLocation ? '' : currentLocation || '')
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedLocation, setDetectedLocation] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  
  const { isReady, getSuggestions, getPlaceDetails, reverseGeocode } = useGooglePlaces()
  
  const hasSuggestions = isSearching || suggestions.length > 0
  
  const closeSmoothly = () => {
    setIsClosing(true)
    window.setTimeout(onClose, 180)
  }

  const chooseLocation = (label, closeDelay = 0) => {
    if (!label) return
    setQuery(label)
    setSuggestions([])
    onLocationSelect(label)

    if (closeDelay > 0) {
      window.setTimeout(closeSmoothly, closeDelay)
      return
    }
    closeSmoothly()
  }

  const detectAutomatically = () => {
    setSuggestions([])
    setDetectedLocation('')

    if (!navigator.geolocation) return

    setIsDetecting(true)

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const fallback = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`

        try {
          if (isReady) {
            const result = await reverseGeocode(coords.latitude, coords.longitude)
            if (result) {
              setDetectedLocation(result.formatted_address)
              chooseLocation(result.formatted_address, 700)
              setIsDetecting(false)
              return
            }
          }
          
          setDetectedLocation(fallback)
          chooseLocation(fallback, 700)
        } catch {
          setDetectedLocation(fallback)
          chooseLocation(fallback, 700)
        } finally {
          setIsDetecting(false)
        }
      },
      () => {
        setIsDetecting(false)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      },
    )
  }

  const selectSuggestion = async (place) => {
    if (isReady) {
      const details = await getPlaceDetails(place.place_id)
      if (details) {
        chooseLocation(details.formatted_address || place.description)
        return
      }
    }
    chooseLocation(place.description)
  }

  useEffect(() => {
    if (!isReady || query.trim().length < 3) {
      setSuggestions([])
      return undefined
    }

    const searchTimer = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await getSuggestions(query)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 360)

    return () => window.clearTimeout(searchTimer)
  }, [query, isReady])

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center bg-[#003F86]/75 px-4 py-5 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade'}`}>
      <div className={`relative h-[425px] w-full max-w-[650px] rounded-xl bg-white shadow-2xl ${isClosing ? 'animate-modal-slide-out' : 'animate-modal-slide'}`}>
        <button
          aria-label="Close location popup"
          className="absolute right-5 -top-14 grid h-11 w-11 place-items-center rounded-full bg-white text-2xl font-normal leading-none text-[#003F86] shadow-md transition hover:scale-105 hover:bg-[#F6FBFF]"
          onClick={closeSmoothly}
          type="button"
        >
          <CloseIcon />
        </button>

        <div className="relative px-5 pt-8">
          <div className="flex h-11 items-center gap-3 rounded-lg border border-blue-200 bg-white px-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center text-blue-900">
              <InputPinIcon />
            </span>
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#003F86] outline-none placeholder:text-blue-700"
              onChange={(event) => {
                const nextQuery = event.target.value
                setQuery(nextQuery)
                if (nextQuery.trim().length < 3) {
                  setSuggestions([])
                }
              }}
              placeholder="Search for your location/society/apartment"
              value={query}
              disabled={!isReady}
            />
          </div>

          <div className="absolute left-5 right-5 top-[78px] z-20">
            {hasSuggestions && (
              <div className="max-h-[298px] overflow-y-auto rounded-lg border border-neutral-100 bg-white shadow-xl">
                {isSearching && (
                  <p className="px-3 py-3 text-[13px] font-normal text-blue-700">Searching suggestions...</p>
                )}
                {!isSearching && suggestions.map((place) => (
                  <button
                    className="flex w-full items-start gap-3 border-b border-neutral-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[#F6FBFF]"
                    key={place.place_id}
                    onClick={() => selectSuggestion(place)}
                    type="button"
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700">
                      <PinIcon />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold leading-5 text-[#003F86]">
                        {place.structured_formatting?.main_text || place.description.split(',')[0]}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] font-normal leading-4 text-blue-800">
                        {place.structured_formatting?.secondary_text || place.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-4 text-[14px] font-semibold uppercase tracking-wide text-blue-900">
            <span className="h-px flex-1 bg-blue-100" />
            <span>OR</span>
            <span className="h-px flex-1 bg-blue-100" />
          </div>

          <button
            className="mx-auto mt-5 flex w-fit items-center justify-center gap-3 rounded-lg px-5 py-2 text-center text-[16px] font-semibold text-blue-700 transition hover:bg-blue-50"
            onClick={detectAutomatically}
            type="button"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-blue-700">
              <LocateIcon />
            </span>
            <span>{isDetecting ? 'Detecting current location' : 'Use current location'}</span>
          </button>
          {detectedLocation && (
            <p className="mx-auto mt-2 max-w-md truncate text-center text-[13px] font-medium text-blue-900">
              {detectedLocation}
            </p>
          )}
        </div>

        <div className="mt-3 h-[122px] border-t-8 border-neutral-100" />

        <div className="absolute inset-x-0 bottom-0 grid h-[62px] place-items-center rounded-b-xl border-t-8 border-neutral-100 bg-white">
          <p className="text-[13px] font-normal text-blue-700">
            powered by <span className="font-semibold text-blue-500">G</span><span className="font-semibold text-red-500">o</span><span className="font-semibold text-yellow-500">o</span><span className="font-semibold text-blue-500">g</span><span className="font-semibold text-[#67B529]">l</span><span className="font-semibold text-red-500">e</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LocationModal
