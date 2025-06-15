import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export const uploadAndStartDownload = async (file: File, outputPath: string) => {
  const formData = new FormData();
  formData.append('jsonFile', file);
  formData.append('outputPath', outputPath);

  const response = await axios.post(`${API_BASE_URL}/download`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};