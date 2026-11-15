// One Unsplash photograph per preset region. Free to use under the Unsplash License; each photographer is credited
// in the page footer. The files were downloaded from images.unsplash.com, resized and bundled in public/img/regions/,
// so the pages need no outside image host. No people appear in any of them.

export interface RegionPhoto {
  /** 1920 px wide, for full-bleed use */
  src: string
  /** 720 px wide, for cards and banners */
  srcSm: string
  width: number
  height: number
  alt: string
  /** where it was taken, as the photographer listed it */
  place: string
  by: string
  /** the photo's page on Unsplash */
  url: string
  /** object-position for wide crops, so the subject stays in frame */
  focus: string
}

const DIR = `${import.meta.env.BASE_URL}img/regions/`
const photo = (id: string, p: Omit<RegionPhoto, 'src' | 'srcSm'>): RegionPhoto => ({ src: `${DIR}${id}.jpg`, srcSm: `${DIR}${id}-sm.jpg`, ...p })

export const PHOTOS: Record<string, RegionPhoto> = {
  'br-amazon': photo('br-amazon', {
    width: 1920, height: 1078,
    alt: 'The Amazon from above near Tefé: floating houses moored at the edge of a flooded forest',
    place: 'Tefé, Amazonas, Brazil', by: 'Rodrigo Kugnharski',
    url: 'https://unsplash.com/photos/aerial-view-of-houses-on-body-of-water-PAgMQ2088RE', focus: '50% 50%',
  }),
  'br-cerrado': photo('br-cerrado', {
    width: 1920, height: 1280,
    alt: 'Cerrado savanna below the escarpments of Chapada dos Veadeiros, dry grass in the foreground',
    place: 'Chapada dos Veadeiros, Goiás, Brazil', by: 'J. Balla Photography',
    url: 'https://unsplash.com/photos/w_uy9e2FZ3M', focus: '50% 60%',
  }),
  'br-pantanal': photo('br-pantanal', {
    width: 1920, height: 1282,
    alt: 'A Pantanal river near Poconé, trees on the far bank in low sun',
    place: 'Poconé, Mato Grosso, Brazil', by: 'Nathalia Segato',
    url: 'https://unsplash.com/photos/Z7qNoZ-nsJc', focus: '50% 55%',
  }),
  'ar-argentina': photo('ar-argentina', {
    width: 1920, height: 1200,
    alt: 'Pampas grass in the Andes foothills at Potrerillos, Mendoza',
    place: 'Potrerillos, Mendoza, Argentina', by: 'Daniela Paola Alchapar',
    url: 'https://unsplash.com/photos/tall-grass-blowing-in-the-wind-on-a-sunny-day-OL8hMCJn1SI', focus: '50% 50%',
  }),
  'in-punjab-haryana': photo('in-punjab-haryana', {
    width: 1920, height: 1200,
    alt: 'Rice paddies in Punjab with power lines crossing the fields',
    place: 'Punjab, India', by: 'Sumeet Singh',
    url: 'https://unsplash.com/photos/a-field-of-grass-with-power-lines-in-the-background-sueHyvd_Rdg', focus: '50% 60%',
  }),
  'us-california': photo('us-california', {
    width: 1920, height: 1080,
    alt: 'California ridgelines rising above a layer of smoke and haze',
    place: 'California, USA', by: 'Chris Linnett',
    url: 'https://unsplash.com/photos/a-view-of-a-foggy-mountain-range-from-an-airplane-T_ob6nza57Y', focus: '50% 50%',
  }),
}

export const photoFor = (id: string): RegionPhoto => PHOTOS[id] ?? PHOTOS['br-amazon']
