from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict()

    DATABASE_URL: str = "sqlite:///./sql_app.db"
    SECRET_KEY: str = "e2a865a7c2b5d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9"  # Change this in production
    AI_AGENT_URL: str = "http://ai-agent:5000" # Default for docker-compose
    AI_AGENT_API_TOKEN: str = "e2a865a7c2b5d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9a9e6b1c2d8f9" # Change this in production

settings = Settings()

