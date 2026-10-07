export interface PositionGPS {
  latitude: number
  longitude: number
  precision: number
}

export function obtenirPositionGPS(): Promise<PositionGPS> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Le GPS n’est pas disponible sur cet appareil.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, precision: p.coords.accuracy }),
      () => reject(new Error('Autorisez la localisation pour enregistrer le punch.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  })
}

export function lienCarte(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}
