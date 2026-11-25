/** JSON error body used by every API route. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}
