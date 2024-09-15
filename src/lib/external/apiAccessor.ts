import axios, { AxiosRequestHeaders } from 'axios';

class APIAccessor {
  private server: string;
  private clientId: string;
  private clientSecret: string;
  private token: string | null;
  private expiration: Date | null;

  constructor(server: string, clientId: string, clientSecret: string) {
    this.server = server;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.expiration = null;
  }

  // 判断Token是否有效
  private async isTokenValid(): Promise<boolean> {
    return this.expiration ? new Date() < this.expiration : false;
  }

  // 请求获取Token
  private async requestAccessToken(): Promise<void> {
    const url = `${this.server}/v1/oauth`;
    const data = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    try {
      const response = await axios.post(url, data, { headers });
      const info = response.data;
      this.token = info.access_token;
      console.error(this.token);
      this.expiration = new Date(Date.now() + info.expires_in * 1000);
    } catch (error) {
      console.error('Failed to acquire API access token:', error);
      throw new Error('Token request failed');
    }
  }

  // 封装GET请求
  public async get<T>(url: string, headers: AxiosRequestHeaders = {} as AxiosRequestHeaders, expectedStatusCode = 200): Promise<T> {
    if (!(await this.isTokenValid())) {
      await this.requestAccessToken();
    }

    headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const response = await axios.get<T>(url, { headers });
      if (response.status !== expectedStatusCode) {
        console.warn(`Unexpected HTTP status code: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  }

  // 封装POST请求
  public async post<T>(url: string, data: any, headers: AxiosRequestHeaders = {} as AxiosRequestHeaders, expectedStatusCode = 200): Promise<T> {
    if (!(await this.isTokenValid())) {
      await this.requestAccessToken();
    }

    headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const response = await axios.post<T>(url, data, { headers });
      if (response.status !== expectedStatusCode) {
        console.warn(`Unexpected HTTP status code: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  }

  // 封装DELETE请求
  public async delete<T>(url: string, headers: AxiosRequestHeaders = {} as AxiosRequestHeaders, expectedStatusCode = 200): Promise<T> {
    if (!(await this.isTokenValid())) {
      await this.requestAccessToken();
    }

    headers['Authorization'] = `Bearer ${this.token}`;
    try {
      const response = await axios.delete<T>(url, { headers });
      if (response.status !== expectedStatusCode) {
        console.warn(`Unexpected HTTP status code: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  }
}

export default APIAccessor;
