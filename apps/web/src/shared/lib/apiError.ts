export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly messages: string | string[],
  ) {
    super(Array.isArray(messages) ? messages.join(', ') : messages);
    this.name = 'ApiError';
  }
}

export async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      statusCode?: number;
      message?: string | string[];
    };
    return new ApiError(
      body.statusCode ?? response.status,
      body.message ?? response.statusText,
    );
  } catch {
    return new ApiError(response.status, response.statusText);
  }
}
