// Property names are the stable identity; tile numbers, prices and ownership are never used.
// Heights are art-directed miniature proportions in the existing landmark footprint.
export const landmarkVisuals = Object.freeze({
  'Taipei 101': { model: 'taipei', height: 2.05, palette: 'jade', features: ['eight flared tiers', 'square crown', 'antenna'] },
  'Petronas Twin Towers': { model: 'petronas', height: 1.95, palette: 'silver', features: ['twin ribbed towers', 'skybridge', 'needle crowns'] },
  'Marina Bay Sands': { model: 'marina', height: 1.15, palette: 'silver', features: ['three hotel slabs', 'boat-shaped skypark', 'rooftop pool'] },
  'Burj Khalifa': { model: 'burj', height: 2.3, palette: 'silver', features: ['asymmetric setbacks', 'silver ribs', 'long spire'] },
  'Eiffel Tower': { model: 'eiffel', height: 1.85, palette: 'iron', features: ['four splayed legs', 'open lattice', 'observation decks'] },
  'Sagrada Família': { model: 'sagrada', height: 1.6, palette: 'sand', features: ['clustered tapering spires', 'coloured finials', 'rose window'] },
  'Colosseum': { model: 'colosseum', height: 0.68, palette: 'sand', features: ['open oval arena', 'two arcades', 'broken upper wall'] },
  'Big Ben': { model: 'bigben', height: 1.65, palette: 'sand', features: ['four clock faces', 'gothic roof', 'gold trim'] },
  'Acropolis': { model: 'acropolis', height: 0.78, palette: 'marble', features: ['rocky plateau', 'open colonnade', 'triangular pediment'] },
  'Christ the Redeemer': { model: 'christ', height: 1.35, palette: 'marble', features: ['outstretched arms', 'robe', 'green mountain pedestal'] },
  'Machu Picchu': { model: 'machu', height: 0.9, palette: 'moss', features: ['steep green peak', 'terraces', 'stone ruins'] },
  'Taj Mahal': { model: 'taj', height: 1.12, palette: 'marble', features: ['onion dome', 'four minarets', 'reflecting pool'] },
  'Angkor Wat': { model: 'angkor', height: 1.05, palette: 'moss', features: ['five lotus towers', 'stepped galleries', 'moat'] },
  'Sydney Opera House': { model: 'opera', height: 0.85, palette: 'marble', features: ['layered curved sails', 'dark glass foyers', 'harbour podium'] },
  'Golden Gate Bridge': { model: 'bridge', height: 1.05, palette: 'vermilion', features: ['red portal towers', 'suspension cables', 'blue bay'] },
  'Statue of Liberty': { model: 'liberty', height: 1.5, palette: 'jade', features: ['raised gold torch', 'seven-point crown', 'tablet and stone plinth'] },
  'Moai of Rapa Nui': { model: 'moai', height: 0.8, palette: 'moss', features: ['three long stone faces', 'heavy brows', 'red stone topknot'] },
  'Chichén Itzá': { model: 'chichen', height: 0.85, palette: 'sand', features: ['nine square terraces', 'central staircase', 'summit temple'] },
  'Pyramids of Giza': { model: 'giza', height: 0.85, palette: 'sand', features: ['three unequal pyramids', 'limestone cap', 'desert base'] },
  'Neuschwanstein Castle': { model: 'castle', height: 1.45, palette: 'marble', features: ['white palace', 'blue conical turrets', 'red gatehouse'] },
  'Mount Fuji': { model: 'fuji', height: 0.9, palette: 'slate', features: ['broad volcanic cone', 'snow cap', 'blue lake and cherry trees'] },
  'Great Wall of China': { model: 'wall', height: 0.65, palette: 'moss', features: ['winding crenellated wall', 'watchtowers', 'green ridgeline'] },
  'Hagia Sophia': { model: 'hagia', height: 1.12, palette: 'terracotta', features: ['wide lead dome', 'cascading half domes', 'four slender minarets'] },
  'Grand Canyon': { model: 'canyon', height: 0.55, palette: 'terracotta', features: ['layered red mesas', 'deep central gorge', 'turquoise river'] }
});

const common = { glass: '#467b93', dark: '#263f50', light: '#ffe1a1', leaf: '#548b49', water: '#4c9faf', gold: '#cea457' };
export const landmarkPalettes = Object.freeze({
  jade: { ...common, wall: '#69a99c', trim: '#b9d9cf', roof: '#33796f', ground: '#c5ccbd' },
  silver: { ...common, wall: '#b9cbd1', trim: '#e4ecea', roof: '#536e80', ground: '#b9c5c5' },
  iron: { ...common, wall: '#927353', trim: '#c2a27a', roof: '#5d4b3c', ground: '#b9c5c5' },
  sand: { ...common, wall: '#d1b68b', trim: '#eee0bc', roof: '#65717a', ground: '#c4a77d' },
  marble: { ...common, wall: '#eee9d9', trim: '#d1b68b', roof: '#536e80', ground: '#b9c5c5' },
  moss: { ...common, wall: '#8f9680', trim: '#c4b89a', roof: '#5c6857', ground: '#638450' },
  vermilion: { ...common, wall: '#cc6343', trim: '#f09866', roof: '#7b4437', ground: '#4c9faf' },
  slate: { ...common, wall: '#8197a7', trim: '#eee9d9', roof: '#536e80', ground: '#638450' },
  terracotta: { ...common, wall: '#c27d61', trim: '#e4b88c', roof: '#65717a', ground: '#c4a77d' }
});
