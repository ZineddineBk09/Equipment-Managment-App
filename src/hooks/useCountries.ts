import { useState, useEffect } from 'react';
import countriesData from '../../assets/countries.json';
import { IApiCountry } from '@/interfaces/country';

export function useCountries() {
  const [countries, setCountries] = useState<IApiCountry[]>([]);

  useEffect(() => {
    setCountries(countriesData as IApiCountry[]);
  }, []);

  return countries;
}
