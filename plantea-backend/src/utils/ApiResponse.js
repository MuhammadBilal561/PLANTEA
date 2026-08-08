// =============================================================
// src/utils/ApiResponse.js
// Plantea — Standardized API Response Formatter
// =============================================================
// Responsibility: Ensure every API response has the same shape.
//
// SE Principle — Refactoring / Remove Code Smell:
//   Without this class, every controller would repeat:
//     res.status(200).json({ success: true, data: ..., message: ... })
//   That is a CODE SMELL (duplicate code). This class extracts
//   it into one reusable place — single source of truth.
//
// Software Quality Impact:
//   Consistent responses reduce frontend bugs and make the API
//   predictable — directly improving maintainability score.
// =============================================================

class ApiResponse {

  /**
   * Send a successful response.
   * @param {object} res      - Express response object
   * @param {any}    data     - Payload to return to the client
   * @param {string} message  - Human-readable success message
   * @param {number} status   - HTTP status code (default 200)
   */
  static success(res, data, message = 'Success', status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(), // helps frontend correlate requests
    });
  }

  /**
   * Send an error response.
   * @param {object} res      - Express response object
   * @param {string} message  - Human-readable error description
   * @param {number} status   - HTTP status code (default 500)
   * @param {any}    errors   - Optional validation error array
   */
  static error(res, message = 'Something went wrong', status = 500, errors = null) {
    const payload = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    // Include detailed errors only when provided (e.g. validation failures)
    if (errors) payload.errors = errors;

    return res.status(status).json(payload);
  }

}

module.exports = ApiResponse;
