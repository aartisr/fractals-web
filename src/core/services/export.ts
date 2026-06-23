export const downloadTextAsFile = (
  fileName: string,
  content: string,
  mime = 'text/plain',
): void => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const downloadJson = (fileName: string, value: unknown): void => {
  downloadTextAsFile(fileName, JSON.stringify(value, null, 2), 'application/json')
}

export const downloadCsv = (fileName: string, csv: string): void => {
  downloadTextAsFile(fileName, csv, 'text/csv')
}

export const downloadDataUrl = (fileName: string, dataUrl: string): void => {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}

