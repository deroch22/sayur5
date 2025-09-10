import React from 'react'
export const Card = ({ className='', ...props }) => <div className={`rounded-md border bg-white ${className}`} {...props} />
export const CardHeader = ({ className='', ...props }) => <div className={`border-b ${className}`} {...props} />
export const CardTitle = ({ className='', ...props }) => <div className={`text-lg font-semibold ${className}`} {...props} />
export const CardContent = ({ className='', ...props }) => <div className={`p-4 ${className}`} {...props} />