import { useState, useEffect, useRef } from 'react'

export function useGooglePlaces() {
  const [isReady, setIsReady] = useState(false)
  const autocompleteService = useRef(null)
  const placesService = useRef(null)
  const geocoderService = useRef(null)

  useEffect(() => {
    // Check if the script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
      geocoderService.current = new window.google.maps.Geocoder()
      setIsReady(true)
      return
    }

    // Wait for the script to load if it's not ready yet
    const intervalId = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService()
        geocoderService.current = new window.google.maps.Geocoder()
        setIsReady(true)
        clearInterval(intervalId)
      }
    }, 100)

    // Fallback cleanup
    setTimeout(() => clearInterval(intervalId), 10000)

    return () => clearInterval(intervalId)
  }, [])

  const getSuggestions = async (input) => {
    if (!isReady || !autocompleteService.current || !input || input.trim().length < 3) {
      return []
    }

    return new Promise((resolve) => {
      autocompleteService.current.getPlacePredictions(
        { input, componentRestrictions: { country: 'in' } },
        (predictions, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([])
            return
          }
          resolve(predictions)
        }
      )
    })
  }

  const getPlaceDetails = async (placeId) => {
    if (!isReady || !geocoderService.current || !placeId) {
      return null
    }

    return new Promise((resolve) => {
      geocoderService.current.geocode({ placeId }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results[0]) {
          const result = results[0]
          
          let city = ''
          let state = ''
          let pincode = ''
          
          result.address_components.forEach((component) => {
            if (component.types.includes('locality')) {
              city = component.long_name
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.long_name
            }
            if (component.types.includes('postal_code')) {
              pincode = component.long_name
            }
          })

          // Fallback if locality is missing
          if (!city) {
            result.address_components.forEach((component) => {
              if (component.types.includes('administrative_area_level_2')) {
                city = component.long_name
              }
            })
          }

          resolve({
            formatted_address: result.formatted_address,
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
            city,
            state,
            pincode,
            raw: result
          })
        } else {
          resolve(null)
        }
      })
    })
  }

  const reverseGeocode = async (lat, lng) => {
    if (!isReady || !geocoderService.current) {
      return null
    }

    return new Promise((resolve) => {
      geocoderService.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results[0]) {
          resolve({
            formatted_address: results[0].formatted_address,
            raw: results[0]
          })
        } else {
          resolve(null)
        }
      })
    })
  }

  return { isReady, getSuggestions, getPlaceDetails, reverseGeocode }
}
