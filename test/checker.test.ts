import consola from 'consola'
import prettier from 'prettier'
import * as validate from 'html-validate'

import { useChecker } from '../src/validator'

jest.mock('prettier', () => ({
  format: jest.fn().mockImplementation((str: string) => {
    if (typeof str !== 'string') {
      throw new TypeError('invalid')
    }
    return 'valid'
  })
}))
jest.mock('consola', () => ({
  withTag: jest.fn().mockImplementation(() => mockReporter)
}))
jest.spyOn(validate, 'formatterFactory')

const mockReporter = {
  success: jest.fn(),
  error: jest.fn()
}

describe('useChecker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('works with a consola reporter', async () => {
    const mockValidator = jest.fn().mockImplementation(() => ({ valid: false, results: [] }))
    const { checkHTML: checker } = useChecker({ validateString: mockValidator } as any)

    await checker('https://test.com/', '<a>Link</a>')
    expect(mockValidator).toHaveBeenCalled()
    expect(consola.withTag).toHaveBeenCalled()
  })

  it('calls the provided validator', async () => {
    const mockValidator = jest.fn().mockImplementation(() => ({ valid: true, results: [] }))
    const { checkHTML: checker } = useChecker({ validateString: mockValidator } as any, false, mockReporter as any)

    await checker('https://test.com/', '<a>Link</a>')
    expect(mockValidator).toHaveBeenCalled()
    expect(mockReporter.success).toHaveBeenCalled()
  })

  it('prints an error message when invalid html is provided', async () => {
    const mockValidator = jest.fn().mockImplementation(() => ({ valid: false, results: [] }))
    const { checkHTML: checker } = useChecker({ validateString: mockValidator } as any, false, mockReporter as any)

    await checker('https://test.com/', '<a>Link</a>')
    expect(mockValidator).toHaveBeenCalled()
    expect(mockReporter.error).toHaveBeenCalled()
  })

  it('records urls when invalid html is provided', async () => {
    const mockValidator = jest.fn().mockImplementation(() => ({ valid: false, results: [] }))
    const { checkHTML: checker, invalidPages } = useChecker({ validateString: mockValidator } as any, false, mockReporter as any)

    await checker('https://test.com/', '<a>Link</a>')
    expect(invalidPages).toContain('https://test.com/')
  })

  it('ignores Vue-generated scoped data attributes', async () => {
    const mockValidator = jest.fn().mockImplementation(() => ({ valid: true, results: [] }))
    const { checkHTML: checker } = useChecker({ validateString: mockValidator } as any, false, mockReporter as any)

    await checker(
      'https://test.com/',
      '<a data-v-35b4e14a data-v-35b4e14a>Link</a>'
    )
    expect(mockValidator).toHaveBeenCalledWith(
      '<a>Link</a>'
    )
    expect(mockReporter.error).not.toHaveBeenCalled()
  })

  it('formats HTML with prettier when asked to do so', async () => {
    const mockValidator = jest.fn().mockImplementation(() => ({ valid: false, results: [] }))
    const { checkHTML: checker } = useChecker({ validateString: mockValidator } as any, true, mockReporter as any)

    await checker('https://test.com/', '<a>Link</a>')
    expect(prettier.format).toHaveBeenCalledWith('<a>Link</a>', { parser: 'html' })
    expect(validate.formatterFactory).toHaveBeenCalledWith('codeframe')
  })

  it('falls back gracefully when prettier cannot format', async () => {
    const mockValidator = jest.fn().mockImplementation(() => ({ valid: false, results: [] }))
    const { checkHTML: checker } = useChecker({ validateString: mockValidator } as any, true, mockReporter as any)

    await checker('https://test.com/', Symbol as any)
    expect(prettier.format).toHaveBeenCalledWith(Symbol, { parser: 'html' })
    expect(mockReporter.error).toHaveBeenCalled()
    expect(validate.formatterFactory).toHaveBeenCalledWith('stylish')
    expect(validate.formatterFactory).not.toHaveBeenCalledWith('codeframe')
  })
})
