import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export interface DiarySummary {
  id: string
  name: string
}

/** Lightweight id/name list of the current user's diaries, for pickers. */
export function useMyDiaries() {
  const { user } = useAuth()
  const [diaries, setDiaries] = useState<DiarySummary[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setDiaries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('diaries')
      .select('id, name')
      .order('created_at', { ascending: false })
    if (!error) setDiaries(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { diaries, loading, refresh }
}
