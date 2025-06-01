import {useEffect, useLayoutEffect, useState} from 'react'
import {Row, Col, Card, Pagination} from 'react-bootstrap'
import { Canvas } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import ShelfRenderer from '../components/three/ShelfRenderer'
import { useSearchParams } from 'react-router-dom'

const ShelfPickerView = () => {
  const { shelves, fetchShelves, shelfPreviousPage, shelfNextPage, shelfTotalPages, activateShelf, duplicateShelf,
    isLoading, disableEditMode, disablePauseMode } = useStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentPage, setCurrentPage] = useState(1)

  // Get page from URL or default to 1
  useEffect(() => {
    const pageParam = searchParams.get('page')
    const page = pageParam ? parseInt(pageParam, 10) : 1
    setCurrentPage(page)
    fetchShelves(page)
  }, [searchParams, fetchShelves])

  useLayoutEffect(() => {
    disableEditMode()
    disablePauseMode()
  }, []);

  // Handle shelf activation
  const handleActivateShelf = (shelfId: number) => {
    activateShelf(shelfId)
  }

  // Handle shelf duplication
  const handleDuplicateShelf = (shelfId: number) => {
    duplicateShelf(shelfId)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setSearchParams({ page: page.toString() })
  }

  const renderPagination = () => {
    // If there's only one page, don't render pagination
    if (shelfTotalPages <= 1) return null

    return (
      <Pagination className="justify-content-center">
        {/* First page */}
        {currentPage > 1 && (
          <Pagination.Item onClick={() => handlePageChange(1)}>1</Pagination.Item>
        )}

        {/* Ellipsis before current page */}
        {currentPage > 3 && <Pagination.Ellipsis />}

        {/* Previous page */}
        {shelfPreviousPage && currentPage > 2 && (
          <Pagination.Item onClick={() => handlePageChange(shelfPreviousPage)}>
            {shelfPreviousPage}
          </Pagination.Item>
        )}

        {/* Current page */}
        <Pagination.Item active>{currentPage}</Pagination.Item>

        {/* Next page */}
        {shelfNextPage && shelfNextPage < shelfTotalPages && (
          <Pagination.Item onClick={() => handlePageChange(shelfNextPage)}>
            {shelfNextPage}
          </Pagination.Item>
        )}

        {/* Ellipsis after current page */}
        {currentPage < shelfTotalPages - 2 && <Pagination.Ellipsis />}

        {/* Last page */}
        {currentPage < shelfTotalPages && (
          <Pagination.Item onClick={() => handlePageChange(shelfTotalPages)}>
            {shelfTotalPages}
          </Pagination.Item>
        )}
      </Pagination>
    )
  }

  // @ts-ignore
    return (
    <>
      <div className="row"><br/><br/></div>
      <Row className="flex-grow-1 g-4 p-3">
        {shelves.map((shelf) => (
          <Col key={shelf.shelf_id} xs={12} md={6}>
            <Card className="h-100 text-center">
              <Card.Body>
                <Card.Title>Shelf {shelf.shelf_id}</Card.Title>
                <div style={{ height: '70%' }}>
                  <Canvas>
                    <ShelfRenderer shelfData={shelf} />
                  </Canvas>
                </div>
                {(!shelf.active &&
                    <button className="m-1 btn btn-primary"
                            onClick={() => handleActivateShelf(Number(shelf.shelf_id))}>
                      Activate
                    </button>
                )}
                <button className="m-1 btn btn-secondary"
                 onClick={() => handleDuplicateShelf(Number(shelf.shelf_id))}>
                                      Duplicate
                </button>
                {/*<Button*/}
                {/*  variant="primary"*/}
                {/*  className="m-1"*/}
                {/*  onClick={() => handleActivateShelf(Number(shelf.shelf_id))}*/}
                {/*  active={Boolean(shelf.active > 0)}*/}
                {/*>*/}
                {/*  Activate*/}
                {/*</Button>*/}

                {/*<Button */}
                {/*  variant="secondary"*/}
                {/*  className="m-1" */}
                {/*  onClick={() => handleDuplicateShelf(shelf.shelf_id)}*/}
                {/*>*/}
                {/*  Duplicate*/}
                {/*</Button>*/}

                <Card.Footer>
                  <small className="text-muted">Last updated {shelf.updated_at}</small>
                </Card.Footer>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="mx-auto">
        <nav aria-label="Page navigation">
          {renderPagination()}
        </nav>
      </Row>

      {isLoading && (
        <div id="my-loader" className="ldld full light"></div>
      )}
    </>
  )
}

export default ShelfPickerView
