export type OfficialSource = { label: string; url: string };

/** Primary government pages used by each destination. No reseller or blog links. */
export const officialSources: Record<string, OfficialSource[]> = {
  TR: [
    { label: "Republic of Türkiye official e-Visa", url: "https://www.evisa.gov.tr/" },
    { label: "Ministry of Foreign Affairs of the Republic of Türkiye", url: "https://www.mfa.gov.tr/" },
  ],
  MA: [
    { label: "Accès Maroc, Ministry of Foreign Affairs", url: "https://www.acces-maroc.ma/" },
    { label: "Ministry of Foreign Affairs of the Kingdom of Morocco", url: "https://www.diplomatie.ma/en" },
  ],
  AU: [
    { label: "Department of Home Affairs, Australia", url: "https://immi.homeaffairs.gov.au/" },
    { label: "Australian visa list", url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing" },
  ],
  ID: [
    { label: "The Official E-visa Website for Indonesia", url: "https://evisa.imigrasi.go.id/" },
    { label: "Directorate General of Immigration, Indonesia", url: "https://www.imigrasi.go.id/" },
    { label: "Ministry of Foreign Affairs, Indonesia", url: "https://kemlu.go.id/" },
  ],
  GB: [
    { label: "UK Visas and Immigration", url: "https://www.gov.uk/browse/visas-immigration" },
    { label: "Standard Visitor visa", url: "https://www.gov.uk/standard-visitor-visa" },
  ],
  TH: [
    { label: "Thai e-Visa, Ministry of Foreign Affairs", url: "https://www.thaievisa.go.th/" },
    { label: "Thailand Digital Arrival Card", url: "https://tdac.immigration.go.th/" },
    { label: "Immigration Bureau of Thailand", url: "https://www.immigration.go.th/" },
  ],
  VN: [
    { label: "Vietnam National Electronic Visa System", url: "https://evisa.gov.vn/" },
    { label: "Ministry of Foreign Affairs of Viet Nam", url: "https://www.mofa.gov.vn/" },
  ],
  MY: [
    { label: "Immigration Department of Malaysia", url: "https://www.imi.gov.my/" },
    { label: "Malaysia Digital Arrival Card", url: "https://imigresen-online.imi.gov.my/mdac/main" },
    { label: "Malaysia eVISA", url: "https://malaysiavisa.imi.gov.my/" },
  ],
  US: [
    { label: "U.S. Department of State, visas", url: "https://travel.state.gov/content/travel/en/us-visas.html" },
    { label: "Consular Electronic Application Center", url: "https://ceac.state.gov/genniv/" },
  ],
  GE: [
    { label: "Georgia e-Visa", url: "https://www.evisa.gov.ge/" },
    { label: "Ministry of Foreign Affairs of Georgia", url: "https://mfa.gov.ge/" },
  ],
  CA: [
    { label: "Immigration, Refugees and Citizenship Canada", url: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
    { label: "Visit Canada", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html" },
  ],
  MV: [
    { label: "Maldives IMUGA traveller declaration", url: "https://imuga.immigration.gov.mv/traveller" },
    { label: "Maldives Immigration", url: "https://immigration.gov.mv/" },
  ],
  AZ: [
    { label: "Azerbaijan ASAN e-Visa", url: "https://www.evisa.gov.az/en/" },
    { label: "Ministry of Foreign Affairs of the Republic of Azerbaijan", url: "https://mfa.gov.az/" },
  ],
  BH: [
    { label: "Kingdom of Bahrain eVisa", url: "https://www.evisa.gov.bh/" },
    { label: "Nationality, Passports and Residence Affairs", url: "https://www.npra.gov.bh/" },
  ],
  HK: [
    { label: "Hong Kong Immigration Department, visit visas", url: "https://www.immd.gov.hk/eng/services/visas/visit-transit/visit-visa-entry-permit.html" },
    { label: "Immigration Department of the Hong Kong SAR", url: "https://www.immd.gov.hk/" },
  ],
  LK: [
    { label: "Sri Lanka Electronic Travel Authorization", url: "https://www.eta.gov.lk/slvisa/" },
    { label: "Department of Immigration and Emigration, Sri Lanka", url: "https://www.immigration.gov.lk/" },
  ],
  AM: [
    { label: "Visa information, Ministry of Foreign Affairs of Armenia", url: "https://www.mfa.am/en/visa/" },
    { label: "Ministry of Foreign Affairs of the Republic of Armenia", url: "https://www.mfa.am/en" },
  ],
  NZ: [
    { label: "Immigration New Zealand", url: "https://www.immigration.govt.nz/" },
    { label: "NZeTA", url: "https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta" },
  ],
  KH: [
    { label: "Cambodia e-Arrival, General Department of Immigration", url: "https://arrival.gov.kh/" },
  ],
  NP: [
    { label: "Department of Immigration, Nepal", url: "https://www.immigration.gov.np/" },
    { label: "Nepal online tourist visa", url: "https://nepaliport.immigration.gov.np/" },
  ],
  UZ: [
    { label: "Uzbekistan e-Visa", url: "https://e-visa.gov.uz/" },
    { label: "Ministry of Foreign Affairs of the Republic of Uzbekistan", url: "https://mfa.uz/en" },
  ],
  TZ: [
    { label: "Tanzania e-Visa", url: "https://visa.immigration.go.tz/" },
    { label: "Tanzania Immigration", url: "https://www.immigration.go.tz/" },
  ],
  IE: [
    { label: "Irish Immigration Service", url: "https://www.irishimmigration.ie/" },
    { label: "Visas for Ireland", url: "https://www.irishimmigration.ie/coming-to-visit-ireland/" },
  ],
  ET: [
    { label: "Ethiopia e-Visa", url: "https://www.evisa.gov.et/" },
  ],
  LA: [
    { label: "Lao eVisa, Ministry of Foreign Affairs", url: "https://laoevisa.gov.la/" },
  ],
  QA: [
    { label: "Hayya, Qatar entry", url: "https://hayya.qa/" },
    { label: "Ministry of Interior, Qatar", url: "https://portal.moi.gov.qa/" },
  ],
  MZ: [
    { label: "Mozambique eVisa, National Immigration Service", url: "https://evisa.gov.mz/" },
  ],
  TG: [
    { label: "Togo Voyage", url: "https://voyage.gouv.tg/" },
  ],
  CD: [
    { label: "Direction Générale de Migration, DRC", url: "https://www.dgm.cd/" },
    { label: "Ministry of Foreign Affairs, Democratic Republic of the Congo", url: "https://diplomatie.gouv.cd/" },
  ],
  DJ: [
    { label: "Djibouti e-Visa", url: "https://www.evisa.gouv.dj/" },
  ],
  AG: [
    { label: "Immigration Department of Antigua and Barbuda", url: "https://immigration.gov.ag/" },
    { label: "Antigua and Barbuda visa on arrival", url: "https://immigration.gov.ag/visa-services/visa-on-arrival/" },
  ],
  PG: [
    { label: "Papua New Guinea Immigration and Citizenship Authority", url: "https://ica.gov.pg/" },
    { label: "Papua New Guinea eVisa", url: "https://evisa.ica.gov.pg/" },
  ],
  SL: [
    { label: "Sierra Leone Immigration Department", url: "https://slid.gov.sl/" },
    { label: "Sierra Leone e-Visa", url: "https://www.evisa.sl/" },
  ],
  BS: [
    { label: "Government of The Bahamas", url: "https://www.bahamas.gov.bs/" },
    { label: "Bahamas customs declaration", url: "https://exempt.gov.bs/" },
  ],
  GA: [
    { label: "Gabon e-Visa, Direction Générale de la Documentation et de l'Immigration", url: "https://evisa.dgdi.ga/" },
  ],
  GH: [
    { label: "Ghana Immigration Service", url: "https://gis.gov.gh/" },
    { label: "Ministry of Foreign Affairs and Regional Integration, Ghana", url: "https://mfa.gov.gh/" },
  ],
  UG: [
    { label: "Uganda e-immigration", url: "https://visas.immigration.go.ug/" },
    { label: "Directorate of Citizenship and Immigration Control, Uganda", url: "https://www.immigration.go.ug/" },
  ],
  FJ: [
    { label: "Fiji Immigration Department", url: "https://www.immigration.gov.fj/" },
  ],
  CM: [
    { label: "Cameroon e-Visa", url: "https://www.evisacam.cm/" },
  ],
  PK: [
    { label: "Pakistan Online Visa System, NADRA", url: "https://visa.nadra.gov.pk/" },
  ],
  BF: [
    { label: "Burkina Faso e-Visa", url: "https://www.visaburkina.bf/" },
    { label: "Ministry of Foreign Affairs of Burkina Faso", url: "https://www.mae.gov.bf/" },
  ],
  VE: [
    { label: "SAIME, Bolivarian Republic of Venezuela", url: "https://www.saime.gob.ve/" },
    { label: "Ministry of Foreign Affairs of Venezuela", url: "https://www.mppre.gob.ve/" },
  ],
  TT: [
    { label: "Immigration Division, Trinidad and Tobago", url: "https://nationalsecurity.gov.tt/divisions/immigration/" },
  ],
  KN: [
    { label: "Government of St. Kitts and Nevis", url: "https://www.gov.kn/" },
  ],
  AO: [
    { label: "Angola SME Visa", url: "https://www.smevisa.gov.ao/" },
    { label: "Migration and Foreigners Service, Angola", url: "https://www.sme.gov.ao/" },
  ],
  SO: [
    { label: "Somalia Immigration and Citizenship Agency", url: "https://immigration.gov.so/" },
  ],
  TD: [
    { label: "Ministry of Foreign Affairs, Chad", url: "https://www.diplomatie.gouv.td/" },
  ],
  GW: [
    { label: "Ministry of Foreign Affairs of Guinea-Bissau", url: "https://mne.gw/" },
    { label: "Government of Guinea-Bissau", url: "http://gov.gw/" },
  ],
  BI: [
    { label: "Migration Directorate, Burundi", url: "https://migration.gov.bi/" },
  ],
  ST: [
    { label: "Presidency of São Tomé and Príncipe", url: "https://presidencia.st/" },
  ],
  KE: [
    { label: "Kenya Electronic Travel Authorisation", url: "https://etakenya.go.ke/" },
    { label: "Directorate of Immigration Services, Kenya", url: "https://immigration.go.ke/" },
  ],
  BB: [
    { label: "Barbados online immigration and customs form", url: "https://www.travelform.gov.bb/" },
    { label: "Barbados Immigration Department", url: "https://immigration.gov.bb/" },
  ],
  MO: [
    { label: "Public Security Police Force, Macao SAR", url: "https://www.fsm.gov.mo/" },
    { label: "Government of the Macao SAR", url: "https://www.gov.mo/" },
  ],
  GN: [
    { label: "Ministry of Foreign Affairs, Guinea", url: "https://www.mae.gov.gn/" },
  ],
  SS: [
    { label: "Ministry of Foreign Affairs, South Sudan", url: "https://mofaic.gov.ss/" },
  ],
};
