// データセンターとワールドの一覧。ワールドが増えたらここに足す。
export const REGIONS: { title: string; dcs: { name: string; worlds: string[] }[] }[] = [
  {
    title: '日本',
    dcs: [
      { name: 'Elemental', worlds: ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'] },
      { name: 'Gaia', worlds: ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'] },
      { name: 'Mana', worlds: ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan'] },
      { name: 'Meteor', worlds: ['Belias', 'Mandragora', 'Ramuh', 'Shinryu', 'Unicorn', 'Valefor', 'Yojimbo', 'Zeromus'] }
    ]
  },
  {
    title: '北米',
    dcs: [
      { name: 'Aether', worlds: ['Adamantoise', 'Cactuar', 'Faerie', 'Gilgamesh', 'Jenova', 'Midgardsormr', 'Sargatanas', 'Siren'] },
      { name: 'Crystal', worlds: ['Balmung', 'Brynhildr', 'Coeurl', 'Diabolos', 'Goblin', 'Malboro', 'Mateus', 'Zalera'] },
      { name: 'Dynamis', worlds: ['Cuchulainn', 'Golem', 'Halicarnassus', 'Kraken', 'Maduin', 'Marilith', 'Rafflesia', 'Seraph'] },
      { name: 'Primal', worlds: ['Behemoth', 'Excalibur', 'Exodus', 'Famfrit', 'Hyperion', 'Lamia', 'Leviathan', 'Ultros'] }
    ]
  },
  {
    title: '欧州',
    dcs: [
      { name: 'Chaos', worlds: ['Cerberus', 'Louisoix', 'Moogle', 'Omega', 'Phantom', 'Ragnarok', 'Sagittarius', 'Spriggan'] },
      { name: 'Light', worlds: ['Alpha', 'Lich', 'Odin', 'Phoenix', 'Raiden', 'Shiva', 'Twintania', 'Zodiark'] }
    ]
  },
  {
    title: 'オセアニア',
    dcs: [{ name: 'Materia', worlds: ['Bismarck', 'Ravana', 'Sephirot', 'Sophia', 'Zurvan'] }]
  }
];

export const ALL_DCS = REGIONS.flatMap((r) => r.dcs);
export const worldsOf = (dc: string) => ALL_DCS.find((d) => d.name === dc)?.worlds ?? [];
