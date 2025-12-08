'use client';

import { YMaps, Map, Clusterer, Placemark, ZoomControl, FullscreenControl } from '@pbe/react-yandex-maps';
import { clinics } from '@/lib/clinics-data';

export function ClinicsMap() {
  return (
    <div className="w-full relative">
      <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100">
        <YMaps query={{ lang: 'ru_RU' }}>
          <Map 
            defaultState={{ center: [55.75, 60], zoom: 3 }} 
            width="100%" 
            height="100%"
          >
            <Clusterer 
              options={{ 
                preset: 'islands#invertedPinkClusterIcons',
                groupByCoordinates: false, 
              }}
            >
              {clinics.map((clinic) => (
                <Placemark
                  key={clinic.id}
                  geometry={clinic.coords}
                  properties={{
                    balloonContentHeader: `<strong>${clinic.name}</strong>`,
                    balloonContentBody: `<div style="margin-top: 4px;"><span style="color: #666;">${clinic.type}</span><br/><span style="color: #333;">${clinic.address}</span></div>`,
                    hintContent: clinic.name
                  }}
                  options={{
                    preset: 'islands#pinkDotIcon'
                  }}
                  modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}
                />
              ))}
            </Clusterer>
            <ZoomControl options={{ float: 'right' }} />
            <FullscreenControl />
          </Map>
        </YMaps>
      </div>
      
      <div className="mt-6 text-center text-sm text-slate-500">
        Всего {clinics.length} клиник в {new Set(clinics.map(c => c.city)).size} городах
      </div>
    </div>
  );
}
