export function extractErrorMessage(err: any, fallback = 'Something went wrong. Please try again.') {
  const body = err?.error;

  if (err?.status === 401) {
    return 'Invalid credentials. Please log in again.';
  }

  if (err?.status === 403) {
    return 'You do not have permission to do that.';
  }

  if (err?.status === 404) {
    return 'The requested resource was not found.';
  }

  if (err?.status === 500) {
    return 'The server hit an unexpected error. Please try again.';
  }

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object') {
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }

    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }

    if (typeof body.details === 'string' && body.details.trim()) {
      return body.details;
    }

    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors.map((item: any) => typeof item === 'string' ? item : item?.message).filter(Boolean).join(', ');
    }

    const firstValue = Object.values(body).find((value) => typeof value === 'string' && value.trim());
    if (typeof firstValue === 'string' && firstValue.trim()) {
      return firstValue;
    }
  }

  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message;
  }

  return fallback;
}
