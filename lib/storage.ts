import { createClient } from "./supabase"

export async function uploadProjectFile(params: {
  projectId: string
  file: File
  path?: string
}) {
  const { projectId, file } = params
  const key = `${params.path ? params.path.replace(/^\/+|\/+$/g, "") + "/" : ""}${file.name}`
  const objectPath = `project/${projectId}/${key}`

  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("project-files")
    .upload(objectPath, file, { upsert: false })

  if (error) throw error
  return { bucket: "project-files", path: objectPath, key }
}

export async function createSignedUrl(params: {
  projectId: string
  key: string
  expiresIn?: number
}) {
  const { projectId, key, expiresIn = 60 * 10 } = params
  const objectPath = `project/${projectId}/${key}`

  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(objectPath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export async function createSignedUrlByPath(path: string, expiresIn: number = 60 * 10) {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

export async function removeProjectFile(params: {
  projectId: string
  key: string
}) {
  const { projectId, key } = params
  const objectPath = `project/${projectId}/${key}`
  const supabase = createClient()
  const { error } = await supabase.storage.from("project-files").remove([objectPath])
  if (error) throw error
}
