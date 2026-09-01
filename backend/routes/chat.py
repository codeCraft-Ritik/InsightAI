from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from database.session import get_dataset_by_id
from models.dataset import ChatRequest
from routes.auth import get_current_user
from services.rag import answer_with_rag

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask")
def ask_question(payload: ChatRequest, current_user: dict[str, object] = Depends(get_current_user)) -> dict[str, object]:
    dataset = get_dataset_by_id(payload.dataset_id)
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if str(dataset["user_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this dataset")

    try:
        rag_response = answer_with_rag(payload.dataset_id, payload.question)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="InsightAI Intelligence Engine is currently connecting. Please ensure the AI service is active.",
        ) from exc

    return {"question": payload.question, **rag_response}
