"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Todo } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Plus, LogOut, RefreshCw, AlertCircle } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

interface TodoAppProps {
  user: User
  supabaseClient: SupabaseClient
}

export function TodoApp({ user, supabaseClient }: TodoAppProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debug = (message: string) => {
    console.log(`[TODO APP] ${message}`)
  }

  useEffect(() => {
    fetchTodos(false)

    if (!supabaseClient) return

    // Set up real-time subscription for immediate updates
    const channel = supabaseClient
      .channel("todos-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          debug(`Real-time update received: ${payload.eventType}`)

          if (payload.eventType === "INSERT") {
            setTodos((prev) => [payload.new as Todo, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setTodos((prev) => prev.map((todo) => (todo.id === payload.new.id ? (payload.new as Todo) : todo)))
          } else if (payload.eventType === "DELETE") {
            setTodos((prev) => prev.filter((todo) => todo.id !== payload.old.id))
          }
        },
      )
      .subscribe((status) => {
        debug(`Real-time subscription status: ${status}`)
      })

    // Fallback: refresh every 2 minutes as backup
    const fallbackInterval = setInterval(() => {
      debug("Fallback refresh triggered")
      fetchTodos(true)
    }, 120000) // 2 minutes

    return () => {
      debug("Cleaning up real-time subscription and interval")
      supabaseClient.removeChannel(channel)
      clearInterval(fallbackInterval)
    }
  }, [user.id, supabaseClient])

  const fetchTodos = async (isBackground = false) => {
    if (!isBackground) setInitialLoading(true)
    else setIsRefreshing(true)

    setError(null)

    try {
      const { data, error: fetchError } = await supabaseClient
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (fetchError) throw new Error(fetchError.message)

      setTodos(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error fetching todos"
      setError(errorMessage)
    } finally {
      if (!isBackground) setInitialLoading(false)
      else setIsRefreshing(false)
    }
  }

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    const tempId = Date.now() // Temporary ID for optimistic update
    const optimisticTodo: Todo = {
      id: tempId,
      text: newTodo,
      user_id: user.id,
      completed: false,
      created_at: new Date().toISOString(),
    }

    // Optimistic update - add immediately to UI
    setTodos((prev) => [optimisticTodo, ...prev])
    setNewTodo("")

    try {
      const { data, error: insertError } = await supabaseClient
        .from("todos")
        .insert([{ text: newTodo, user_id: user.id, completed: false }])
        .select()

      if (insertError) throw new Error(insertError.message)

      // Replace optimistic todo with real one from database
      if (data && data[0]) {
        setTodos((prev) => prev.map((todo) => (todo.id === tempId ? data[0] : todo)))
      }
    } catch (err) {
      // Remove optimistic todo on error
      setTodos((prev) => prev.filter((todo) => todo.id !== tempId))
      const errorMessage = err instanceof Error ? err.message : "Unknown error adding todo"
      setError(`Failed to add todo: ${errorMessage}`)
    }
  }

  const toggleTodo = async (id: number, completed: boolean) => {
    // Optimistic update - change immediately in UI
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !completed } : todo)))

    try {
      const { error: updateError } = await supabaseClient.from("todos").update({ completed: !completed }).eq("id", id)

      if (updateError) throw new Error(updateError.message)
    } catch (err) {
      // Revert optimistic update on error
      setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: completed } : todo)))
      const errorMessage = err instanceof Error ? err.message : "Unknown error toggling todo"
      setError(`Failed to update todo: ${errorMessage}`)
    }
  }

  const deleteTodo = async (id: number) => {
    // Store the todo for potential rollback
    const todoToDelete = todos.find((todo) => todo.id === id)

    // Optimistic update - remove immediately from UI
    setTodos((prev) => prev.filter((todo) => todo.id !== id))

    try {
      const { error: deleteError } = await supabaseClient.from("todos").delete().eq("id", id)

      if (deleteError) throw new Error(deleteError.message)
    } catch (err) {
      // Restore the todo on error
      if (todoToDelete) {
        setTodos((prev) => [todoToDelete, ...prev])
      }
      const errorMessage = err instanceof Error ? err.message : "Unknown error deleting todo"
      setError(`Failed to delete todo: ${errorMessage}`)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabaseClient.auth.signOut()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error signing out"
      setError(`Failed to sign out: ${errorMessage}`)
    }
  }

  const handleRefresh = () => {
    fetchTodos(true)
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-lg">Loading todos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">My Todos</h1>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Todo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addTodo} className="flex gap-2">
              <Input
                type="text"
                placeholder="What needs to be done?"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {todos.map((todo) => (
            <Card key={todo.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <Checkbox
                  id={`todo-${todo.id}`}
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id, todo.completed)}
                />
                <label
                  htmlFor={`todo-${todo.id}`}
                  className={`flex-1 cursor-pointer ${todo.completed ? "line-through text-gray-500" : "text-gray-900"}`}
                >
                  {todo.text}
                </label>
                <Button
                  onClick={() => deleteTodo(todo.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {todos.length === 0 && (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                No todos yet. Add one above to get started!
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
