async updateRole(userId, data) {
  try {
    const response = await api.put(`/teams/${userId}`, data);
    return response.data;
  } catch (error) {
    // Extract error code and message from the backend response
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || "Failed to update role";
    
    // Create a custom error with both code and message
    const customError = new Error(errorMessage);
    customError.code = errorCode;
    
    throw customError;
  }
} 