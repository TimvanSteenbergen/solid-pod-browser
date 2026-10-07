export const RDF = {
  type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
}

export const SOLID = {
  TypeRegistration: 'http://www.w3.org/ns/solid/terms#TypeRegistration',
  forClass: 'http://www.w3.org/ns/solid/terms#forClass',
  instance: 'http://www.w3.org/ns/solid/terms#instance',
  instanceContainer: 'http://www.w3.org/ns/solid/terms#instanceContainer',
  publicTypeIndex: 'http://www.w3.org/ns/solid/terms#publicTypeIndex',
  privateTypeIndex: 'http://www.w3.org/ns/solid/terms#privateTypeIndex',
}

export const SCHEMA = {
  Person: 'https://schema.org/Person',
  Place: 'https://schema.org/Place',
  PostalAddress: 'https://schema.org/PostalAddress',
  GeoCoordinates: 'https://schema.org/GeoCoordinates',

  name: 'https://schema.org/name',
  givenName: 'https://schema.org/givenName',
  familyName: 'https://schema.org/familyName',
  email: 'https://schema.org/email',
  telephone: 'https://schema.org/telephone',
  birthDate: 'https://schema.org/birthDate',
  description: 'https://schema.org/description',

  address: 'https://schema.org/address',
  streetAddress: 'https://schema.org/streetAddress',
  postalCode: 'https://schema.org/postalCode',
  addressLocality: 'https://schema.org/addressLocality',
  addressCountry: 'https://schema.org/addressCountry',

  geo: 'https://schema.org/geo',
  latitude: 'https://schema.org/latitude',
  longitude: 'https://schema.org/longitude',

  Event: 'https://schema.org/Event',
  Schedule: 'https://schema.org/Schedule',

  startDate: 'https://schema.org/startDate',
  endDate: 'https://schema.org/endDate',
  startTime: 'https://schema.org/startTime',
  endTime: 'https://schema.org/endTime',
  location: 'https://schema.org/location',
  eventSchedule: 'https://schema.org/eventSchedule',
  repeatFrequency: 'https://schema.org/repeatFrequency',
  byDay: 'https://schema.org/byDay',
  scheduleTimezone: 'https://schema.org/scheduleTimezone',

  ImageGallery: 'https://schema.org/ImageGallery',
  ImageObject: 'https://schema.org/ImageObject',
  ImageObjectSnapshot: 'https://schema.org/ImageObjectSnapshot',

  hasPart: 'https://schema.org/hasPart',
  exampleOfWork: 'https://schema.org/exampleOfWork',
  contentUrl: 'https://schema.org/contentUrl',
  caption: 'https://schema.org/caption',
  width: 'https://schema.org/width',
  height: 'https://schema.org/height',
  uploadDate: 'https://schema.org/uploadDate',
  encodingFormat: 'https://schema.org/encodingFormat',

  image: 'https://schema.org/image',

  Organization: 'https://schema.org/Organization',
  url: 'https://schema.org/url',
  logo: 'https://schema.org/logo',
  member: 'https://schema.org/member',
  identifier: 'https://schema.org/identifier',

  OrganizationRole: 'https://schema.org/OrganizationRole',
  EmployeeRole: 'https://schema.org/EmployeeRole',

  roleName: 'https://schema.org/roleName',
  numberedPosition: 'https://schema.org/numberedPosition',
  memberOf: 'https://schema.org/memberOf',
  employee: 'https://schema.org/employee',
  worksFor: 'https://schema.org/worksFor',
  baseSalary: 'https://schema.org/baseSalary',
  salaryCurrency: 'https://schema.org/salaryCurrency',

  School: 'https://schema.org/School',
  alumni: 'https://schema.org/alumni',
  // No canonical schema.org property names "education level" on
  // EducationalOrganization; reusing educationalLevel (defined on
  // CreativeWork/EducationalOccupationalCredential) for School is the
  // closest fit in the vocabulary.
  educationalLevel: 'https://schema.org/educationalLevel',

  Certification: 'https://schema.org/Certification',
  about: 'https://schema.org/about',
  issuedBy: 'https://schema.org/issuedBy',
  certificationIdentification: 'https://schema.org/certificationIdentification',
  certificationStatus: 'https://schema.org/certificationStatus',
  datePublished: 'https://schema.org/datePublished',
  validFrom: 'https://schema.org/validFrom',
  expires: 'https://schema.org/expires',
  auditDate: 'https://schema.org/auditDate',
}

// schema:certificationStatus takes values from schema.org's
// CertificationStatusEnumeration.
export const CERTIFICATION_STATUS = {
  CertificationActive: 'https://schema.org/CertificationActive',
  CertificationInactive: 'https://schema.org/CertificationInactive',
}

// schema:byDay takes values from schema.org's DayOfWeek enumeration.
export const DAY_OF_WEEK = {
  Monday: 'https://schema.org/Monday',
  Tuesday: 'https://schema.org/Tuesday',
  Wednesday: 'https://schema.org/Wednesday',
  Thursday: 'https://schema.org/Thursday',
  Friday: 'https://schema.org/Friday',
  Saturday: 'https://schema.org/Saturday',
  Sunday: 'https://schema.org/Sunday',
}
