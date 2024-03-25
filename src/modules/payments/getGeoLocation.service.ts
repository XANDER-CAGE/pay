import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface ILocation {
  status: 'success' | 'fail';
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

@Injectable()
export class LocationService {
  async getLocationByIP(ip: string): Promise<ILocation> {
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      console.log(response.data);

      return response.data;
    } catch (error) {
      const errorMessage =
        'Error fetching location data: Error' + error.message;
      throw new Error(errorMessage);
    }
  }
}
