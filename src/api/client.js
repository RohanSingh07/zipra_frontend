import * as SecureStore from "expo-secure-store";
import axios from "axios";

const API = axios.create({
  baseURL: "http://192.168.1.7:8000/api",
});

//  Attach token automatically
API.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;