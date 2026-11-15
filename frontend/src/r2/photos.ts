// One Unsplash photograph per preset region (free to use under the Unsplash License), and a 12-second clip per region
// chosen by the team (Pexels and Pixabay clips under their own free licences; the Pantanal clip is from The Nature
// Project's YouTube film): one continuous shot, slowed to the same camera pace and graded to the same look by
// scripts/region-video.py, 1280x720, silent, in public/video/regions/, with its first frame as the poster. The landing
// plays each once per showing, from the top, never looped. Every photographer and videographer is credited in the page
// footer, with where the clip was filmed when that isn't the region itself. No people appear in any of them.

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
  /** a drone loop of the same region, when one could be found */
  video?: {
    src: string; poster: string; about: string
    /** the videographer, or null when the source doesn't name one */
    by: string | null
    url: string | null
    site: 'Pexels' | 'Pixabay' | 'YouTube'
    /** where it was filmed, when that isn't certainly the region itself */
    filmed?: string
  }
}

const DIR = `${import.meta.env.BASE_URL}img/regions/`
const VID = `${import.meta.env.BASE_URL}video/regions/`
const clip = (id: string, site: 'Pexels' | 'Pixabay' | 'YouTube', by: string | null, url: string | null, about: string, filmed?: string) =>
  ({ src: `${VID}${id}.mp4`, poster: `${VID}${id}-poster.jpg`, site, by, url, about, filmed })
const photo = (id: string, p: Omit<RegionPhoto, 'src' | 'srcSm'>): RegionPhoto => ({ src: `${DIR}${id}.jpg`, srcSm: `${DIR}${id}-sm.jpg`, ...p })

export const PHOTOS: Record<string, RegionPhoto> = {
  'br-amazon': photo('br-amazon', {
    width: 1920, height: 1078,
    alt: 'The Amazon from above near Tefé: floating houses moored at the edge of a flooded forest',
    place: 'Tefé, Amazonas, Brazil', by: 'Rodrigo Kugnharski',
    url: 'https://unsplash.com/photos/aerial-view-of-houses-on-body-of-water-PAgMQ2088RE', focus: '50% 50%',
    video: clip('br-amazon', 'Pixabay', 'ارمان', 'https://pixabay.com/videos/id-267371/', 'A drone over rainforest, a waterfall falling into a forested gorge', 'filmed in the Colombian Amazon (Putumayo)'),
  }),
  'br-cerrado': photo('br-cerrado', {
    width: 1920, height: 1280,
    alt: 'Cerrado savanna below the escarpments of Chapada dos Veadeiros, dry grass in the foreground',
    place: 'Chapada dos Veadeiros, Goiás, Brazil', by: 'J. Balla Photography',
    video: clip('br-cerrado', 'Pixabay', 'MAURICIO_BR', 'https://pixabay.com/videos/id-179950/', 'A time-lapse at sunrise: clouds over a forested peak and a green valley', 'location not stated'),
    url: 'https://unsplash.com/photos/w_uy9e2FZ3M', focus: '50% 60%',
  }),
  'br-pantanal': photo('br-pantanal', {
    width: 1920, height: 1282,
    alt: 'A Pantanal river near Poconé, trees on the far bank in low sun',
    place: 'Poconé, Mato Grosso, Brazil', by: 'Nathalia Segato',
    video: clip('br-pantanal', 'YouTube', 'The Nature Project', null, 'A drone over the North Pantanal, a brown river winding through green wetland'),
    url: 'https://unsplash.com/photos/Z7qNoZ-nsJc', focus: '50% 55%',
  }),
  'ar-argentina': photo('ar-argentina', {
    width: 1920, height: 1200,
    alt: 'Pampas grass in the Andes foothills at Potrerillos, Mendoza',
    place: 'Potrerillos, Mendoza, Argentina', by: 'Daniela Paola Alchapar',
    video: clip('ar-argentina', 'Pixabay', 'JoshuaWoroniecki', 'https://pixabay.com/videos/id-369259/', 'A river at dusk under mountains and low cloud', 'filmed in Chilean Patagonia'),
    url: 'https://unsplash.com/photos/tall-grass-blowing-in-the-wind-on-a-sunny-day-OL8hMCJn1SI', focus: '50% 50%',
  }),
  'in-punjab-haryana': photo('in-punjab-haryana', {
    width: 1920, height: 1200,
    alt: 'Rice paddies in Punjab with power lines crossing the fields',
    place: 'Punjab, India', by: 'Sumeet Singh',
    video: clip('in-punjab-haryana', 'Pexels', null, 'https://www.pexels.com/video/20119487/', 'A drone over flat farmland and a farmhouse', 'location not stated'),
    url: 'https://unsplash.com/photos/a-field-of-grass-with-power-lines-in-the-background-sueHyvd_Rdg', focus: '50% 60%',
  }),
  'us-california': photo('us-california', {
    width: 1920, height: 1080,
    alt: 'California ridgelines rising above a layer of smoke and haze',
    place: 'California, USA', by: 'Chris Linnett',
    url: 'https://unsplash.com/photos/a-view-of-a-foggy-mountain-range-from-an-airplane-T_ob6nza57Y', focus: '50% 50%',
    video: clip('us-california', 'Pexels', 'vignesh srivatsav', 'https://www.pexels.com/video/scenic-aerial-view-of-california-hills-36216373/', 'A drone along California hills, dry grass and oak woodland'),
  }),
}

export const photoFor = (id: string): RegionPhoto => PHOTOS[id] ?? PHOTOS['br-amazon']
