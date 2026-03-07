"""Unit tests for sample_item_service."""

from sqlalchemy.orm import Session

from app.schemas.sample_item import SampleItemCreate
from app.services.sample_item_service import create_sample_item, list_sample_items


class TestCreateSampleItem:
    """Tests for create_sample_item function."""

    def test_creates_item_with_name_and_description(self, db_session: Session) -> None:
        payload = SampleItemCreate(name="Test Item", description="A test description")

        result = create_sample_item(db_session, payload)

        assert result.name == "Test Item"
        assert result.description == "A test description"
        assert result.id is not None
        assert result.created_at is not None

    def test_creates_item_without_description(self, db_session: Session) -> None:
        payload = SampleItemCreate(name="No Description Item")

        result = create_sample_item(db_session, payload)

        assert result.name == "No Description Item"
        assert result.description is None

    def test_strips_whitespace_from_name(self, db_session: Session) -> None:
        payload = SampleItemCreate(name="  Whitespace Name  ", description="desc")

        result = create_sample_item(db_session, payload)

        assert result.name == "Whitespace Name"

    def test_persists_item_to_database(self, db_session: Session) -> None:
        payload = SampleItemCreate(name="Persisted Item", description="Should be saved")

        result = create_sample_item(db_session, payload)

        # Verify the item is in the database
        items = list_sample_items(db_session)
        assert len(items) == 1
        assert items[0].id == result.id


class TestListSampleItems:
    """Tests for list_sample_items function."""

    def test_returns_empty_list_when_no_items(self, db_session: Session) -> None:
        result = list_sample_items(db_session)

        assert result == []

    def test_returns_items_ordered_by_created_at_desc(self, db_session: Session) -> None:
        # Create items
        create_sample_item(db_session, SampleItemCreate(name="First Item"))
        create_sample_item(db_session, SampleItemCreate(name="Second Item"))
        create_sample_item(db_session, SampleItemCreate(name="Third Item"))

        result = list_sample_items(db_session)

        assert len(result) == 3
        # Most recent first (DESC order)
        assert result[0].name == "Third Item"
        assert result[1].name == "Second Item"
        assert result[2].name == "First Item"

    def test_returns_all_items(self, db_session: Session) -> None:
        for i in range(5):
            create_sample_item(db_session, SampleItemCreate(name=f"Item {i}"))

        result = list_sample_items(db_session)

        assert len(result) == 5
