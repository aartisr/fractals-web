interface FilePickerProps {
  label: string
  onChange: (file: File | null) => void
}

export function FilePicker({ label, onChange }: FilePickerProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/bmp,image/tiff,image/gif"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          onChange(file)
        }}
      />
    </label>
  )
}
