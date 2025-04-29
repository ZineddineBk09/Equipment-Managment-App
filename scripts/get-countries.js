// get countries and their flags and same them in  json file
// using free countries api: https://www.apicountries.com/countries
import fs from "fs";
import axios from "axios";

const API_URL = "https://www.apicountries.com/countries";
const OUTPUT_FILE = "./assets/countries.json";

async function fetchCountries() {
  try {
    const response = await axios.get(API_URL);
    const countries = response.data;

    // Save the data to a JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(countries, null, 2));
    console.log(`Countries data saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("Error fetching countries data:", error?.message);
  }
}

fetchCountries();
