import CompanyFolder from './CompanyFolder'

interface FolderData {
  name: string
  subfolders: { name: string; file_count: number }[]
}

interface Props {
  folders: FolderData[]
}

export default function FileList({ folders }: Props) {
  return (
    <div className="mt-4 space-y-3">
      {folders.map((folder) => (
        <CompanyFolder key={folder.name} folder={folder} />
      ))}
    </div>
  )
}
