declare module 'country-telephone-data' {
  const countryTelephoneData: {
    allCountries: Array<{ name: string; iso2: string; dialCode: string | number }>;
    iso2Lookup?: unknown;
    allCountryCodes?: unknown;
  };
  export default countryTelephoneData;
}
