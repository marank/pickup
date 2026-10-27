# Pickup - Image and Video Sharing Platform

A modern web application for sharing images and videos without requiring user accounts. Users can create or join "Pickups" (shared spaces) and upload media to their personal folders while viewing content from all participants.

## Features

- 🚀 **No Account Required** - Start sharing immediately
- 📁 **Personal Folders** - Each user gets their own folder with full control
- 🔗 **Easy Sharing** - Simple share links for pickups
- 📧 **Email Reminders** - Optional email delivery of share links
- 🔒 **Secure Authentication** - Cookie-based authentication with auth tokens
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Modern UI** - Built with Vue 3 and Tailwind CSS

## Tech Stack

### Backend
- **Django 6.0.6** - Web framework
- **Django REST Framework** - API development
- **Pillow** - Image processing
- **SQLite** - Database (development)

### Frontend
- **Vue 3** - JavaScript framework
- **TypeScript** - Type safety
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **Axios** - HTTP client
- **Vue Toastification** - Notifications

## Project Structure

```
pickup/
├── backend/                 # Django backend
│   ├── config/             # Django project: settings, env helpers, URL roots
│   ├── apps/
│   │   ├── core/           # base models (UUID pks), checks, health, management commands
│   │   ├── accounts/       # custom User (admin login)
│   │   └── pickups/        # models/, serializers/, api/, services/, admin/, tests/
│   ├── data/               # runtime data: uploaded media (DATA_DIR, not in git)
│   └── pyproject.toml      # dependencies (uv), ruff and pytest config
├── frontend/               # Vue.js frontend
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── views/          # Page views
│   │   ├── stores/         # Pinia stores
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   └── package.json        # Node dependencies
├── .env.example            # all configuration, documented
└── README.md
```

## Getting Started

### Prerequisites
- [uv](https://docs.astral.sh/uv/) (installs Python 3.14 itself)
- Node.js 22.18+ or 24.12+

### Configuration

See `.env.example`. Mail: with `EMAIL_HOST` empty, share-link mails are printed to the backend console; set the `EMAIL_*` variables to send them via SMTP.

## Security Features

- **Cookie-based Authentication** - Secure HTTP-only cookies with auth tokens
- **File Validation** - Type and size validation for uploaded files
- **CSRF Protection** - Django's built-in CSRF protection

## Deployment

### Backend (Production)
1. Set `DEBUG=False` in settings
2. Configure `ALLOWED_HOSTS`
3. Set up production database (PostgreSQL recommended)
4. Configure static file serving
5. Set up email backend
6. Use HTTPS for secure cookies

### Frontend (Production)
1. Build the application: `npm run build`
2. Serve static files with nginx or similar
3. Update `VITE_API_URL` to production backend URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions, please open an issue on the GitHub repository.
