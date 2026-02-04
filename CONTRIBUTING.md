# Contributing to TradingView API Client

Thank you for your interest in contributing to the TradingView API Client! This document provides guidelines and information to help you contribute effectively.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Security Policy](#security-policy)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How to Contribute

There are several ways you can contribute to this project:

### Bug Reports
- Report bugs by creating an issue
- Provide detailed steps to reproduce
- Include environment information (Node.js version, OS, etc.)
- Check existing issues before creating new ones

### Feature Requests
- Suggest new features or enhancements
- Explain the use case and benefits
- Consider the impact on existing functionality

### Code Contributions
- Fix bugs and typos
- Add new features
- Improve performance
- Refactor code for better maintainability

### Documentation
- Improve existing documentation
- Add usage examples
- Clarify unclear sections
- Fix grammatical errors

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- [mise](https://mise.jdx.dev/) (for managing Node.js and pnpm versions)
- Or alternatively, manual installation of Node.js and pnpm

### Setup Instructions
1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tradingview-api.git
   cd tradingview-api
   ```
3. Install dependencies using mise and pnpm:
   ```bash
   # Install mise if you haven't already (https://mise.jdx.dev/)
   # Install the correct Node.js and pnpm versions using mise
   mise install
   # Install project dependencies with pnpm
   pnpm install
   ```
4. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-description
   ```

### Environment Configuration
Create a `.env` file to store sensitive information for testing:
```
TV_SESSION_ID=your_session_id
TV_SIGNATURE=your_signature
TV_USERNAME=your_username
TV_PASSWORD=your_password
```

## Coding Standards

### JavaScript Style Guide
- Follow the existing code style and patterns
- Use ESLint for code linting (configured in `.eslintrc.js`)
- Write JSDoc comments for all public methods and classes
- Use descriptive variable and function names
- Keep functions small and focused on a single responsibility

### Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for classes and constructors
- Use UPPER_CASE for constants
- Use descriptive names that convey purpose

### Code Structure
- Organize code by feature/module in the `src` directory
- Keep related functionality together
- Separate concerns appropriately
- Use consistent file naming conventions

### Example of Good Code Style
```javascript
/**
 * Calculate reconnection delay with exponential backoff
 * @param {number} attempt - Current attempt number
 * @returns {number} Delay in milliseconds
 */
#calculateReconnectionDelay(attempt) {
  let delay = RECONNECTION_CONFIG.baseDelay * Math.pow(RECONNECTION_CONFIG.multiplier, attempt);
  
  // Apply maximum delay cap
  delay = Math.min(delay, RECONNECTION_CONFIG.maxDelay);
  
  // Add jitter to prevent thundering herd
  if (RECONNECTION_CONFIG.jitter) {
    const jitter = Math.random() * 0.3; // 30% jitter
    delay = delay * (1 + jitter);
  }
  
  return Math.round(delay);
}
```

## Testing

### Test Framework
The project uses Vitest for testing. Run tests with:
```bash
# Using npm
npm test
# or for continuous testing
npm run test:watch

# Using pnpm (recommended)
pnpm test
# or for continuous testing
pnpm run test:watch
```

### Test Structure
Tests are located in the `tests/` directory and follow these patterns:
- `*.test.js` files for unit and integration tests
- Separate test files by functionality
- Use descriptive test names

### Writing Tests
- Write tests for new functionality
- Ensure existing tests pass before submitting
- Test edge cases and error conditions
- Use meaningful test descriptions

### Example Test Structure
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import TradingView from '../main';

describe('Client', () => {
  let client;
  
  beforeEach(() => {
    client = new TradingView.Client();
  });
  
  afterEach(() => {
    if (client) {
      await client.end();
    }
  });
  
  it('should connect successfully', async () => {
    // Test implementation
    expect(client.isOpen).toBe(true);
  });
});
```

## Documentation

### Code Documentation
- Document all public methods with JSDoc
- Include parameter types, descriptions, and return values
- Provide usage examples where helpful
- Keep documentation up-to-date with code changes

### External Documentation
Update the following documents as needed:
- README.md - Main project documentation
- API_SPEC.md - Detailed API specification
- USAGE_EXAMPLES.md - Practical usage examples
- TROUBLESHOOTING.md - Problem resolution guide
- ARCHITECTURE.md - System design documentation

### Documentation Style
- Use clear, concise language
- Provide practical examples
- Keep examples up-to-date
- Use consistent formatting

## Pull Request Process

### Before Submitting
1. Ensure all tests pass
2. Update documentation as needed
3. Add tests for new functionality
4. Follow the coding standards
5. Squash commits if necessary to create a clean history

### Creating a Pull Request
1. Push your changes to your fork
2. Create a pull request from your fork to the main repository
3. Provide a clear title and description
4. Reference related issues if applicable
5. Include the following information:
   - What changes are made
   - Why these changes are needed
   - How the changes address the issue

### Pull Request Template
Use the following template for pull requests:

```
## Description
Brief description of changes made

## Related Issue
Fixes #(issue number)

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New functionality tested
- [ ] Existing functionality still works

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

### Review Process
- Maintainers will review your pull request
- Changes may be requested before merging
- Respond to feedback in a timely manner
- Be open to suggestions and improvements

## Issue Reporting

### Bug Reports
When reporting bugs, please include:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Environment information (Node.js version, OS, etc.)
- Any relevant error messages or logs
- Screenshots if applicable

### Feature Requests
For feature requests, please include:
- A clear description of the feature
- The use case and benefits
- Any potential implementation ideas
- How it would integrate with existing functionality

### Issue Template
```
## Expected Behavior


## Actual Behavior


## Steps to Reproduce the Problem

1.
2.
3.

## Specifications

- Node.js version:
- OS:
- Package version:
```

## Security Policy

### Reporting Security Issues
If you discover a security vulnerability, please report it responsibly:

- Do not create a public GitHub issue
- Contact the maintainers directly
- Provide detailed information about the vulnerability
- Include steps to reproduce
- Suggest potential fixes if possible

### Security Best Practices
When contributing code:
- Never commit sensitive information (API keys, passwords, etc.)
- Use environment variables for sensitive data
- Validate and sanitize all inputs
- Follow secure coding practices
- Review code for potential security issues

## Recognition

Contributors will be recognized in the project documentation. Significant contributions may be acknowledged in release notes.

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with the "question" label
- Reach out to the maintainers
- Check the existing documentation

Thank you for contributing to the TradingView API Client project!