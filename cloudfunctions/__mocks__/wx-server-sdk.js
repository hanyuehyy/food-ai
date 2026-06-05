const mockGet = jest.fn().mockResolvedValue({ data: [] })
const mockCount = jest.fn().mockResolvedValue({ total: 0 })
const mockAdd = jest.fn().mockResolvedValue({ _id: 'mock-id' })
const mockUpdate = jest.fn().mockResolvedValue({ stats: { updated: 1 } })
const mockRemove = jest.fn().mockResolvedValue({ stats: { removed: 1 } })
const mockLimit = jest.fn().mockReturnThis()
const mockSkip = jest.fn().mockReturnThis()
const mockOrderBy = jest.fn().mockReturnThis()
const mockField = jest.fn().mockReturnThis()
const mockWhere = jest.fn().mockReturnThis()
const mockDoc = jest.fn().mockReturnValue({
  get: mockGet,
  update: mockUpdate,
  remove: mockRemove
})

const mockCollection = jest.fn().mockReturnValue({
  where: mockWhere,
  doc: mockDoc,
  add: mockAdd,
  get: mockGet,
  count: mockCount,
  limit: mockLimit,
  skip: mockSkip,
  orderBy: mockOrderBy,
  field: mockField
})

const mockGetTempFileURL = jest.fn().mockResolvedValue({
  fileList: []
})

const mockDownloadFile = jest.fn().mockResolvedValue({
  fileContent: Buffer.from('mock')
})

const mockUploadFile = jest.fn().mockResolvedValue({
  fileID: 'cloud://mock-file-id'
})

const mockDeleteFile = jest.fn().mockResolvedValue({
  fileList: []
})

const mockServerDate = jest.fn(() => new Date())

const db = {
  collection: mockCollection,
  command: {
    in: jest.fn((arr) => ({ $in: arr })),
    or: jest.fn((arr) => ({ $or: arr })),
    and: jest.fn((arr) => ({ $and: arr }))
  },
  RegExp: jest.fn(({ regexp, options }) => new RegExp(regexp, options)),
  serverDate: mockServerDate
}

const cloud = {
  init: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'test-env',
  database: jest.fn(() => db),
  getTempFileURL: mockGetTempFileURL,
  downloadFile: mockDownloadFile,
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile
}

// Expose mocks for test assertions
cloud.__mocks = {
  mockGet,
  mockCount,
  mockAdd,
  mockUpdate,
  mockRemove,
  mockLimit,
  mockSkip,
  mockOrderBy,
  mockField,
  mockWhere,
  mockDoc,
  mockCollection,
  mockGetTempFileURL,
  mockDownloadFile,
  mockUploadFile,
  mockDeleteFile,
  mockServerDate,
  db
}

module.exports = cloud
