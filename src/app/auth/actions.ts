'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  console.log('Attempting server-side login for:', data.email);

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Login error:', error.message);
    redirect('/error?message=' + encodeURIComponent(error.message))
  }

  // Verify session is established before redirecting
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    console.error('Session verification failed:', sessionError);
    redirect('/error?message=' + encodeURIComponent('Failed to establish session'))
  }

  console.log('Login successful, session verified, revalidating and redirecting to dashboard');
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    name: formData.get('name') as string,
  }

  // Server-side validation
  if (data.password !== data.confirmPassword) {
    redirect('/error?message=' + encodeURIComponent('비밀번호가 일치하지 않습니다.'))
  }

  if (data.password.length < 8) {
    redirect('/error?message=' + encodeURIComponent('비밀번호는 8자 이상이어야 합니다.'))
  }

  console.log('Attempting server-side signup for:', data.email);

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  })

  if (error) {
    console.error('Signup error:', error.message);
    redirect('/error?message=' + encodeURIComponent(error.message))
  }

  console.log('Signup successful, redirecting to login with success message');
  revalidatePath('/', 'layout')
  redirect('/login?message=signup-success')
}

export async function signout() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Signout error:', error.message);
    redirect('/error?message=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/login')
} 