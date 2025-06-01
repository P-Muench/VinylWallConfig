import {useEffect, useState} from 'react'
import {Canvas} from '@react-three/fiber'
import {useStore} from '../store/useStore'
import {Form} from 'react-bootstrap'
import AlbumPickerRenderer from './three/AlbumPickerRenderer'

interface AlbumPickerProps {
    onSelect: (albumId: number) => void
    onClose: () => void
}

const AlbumPicker = ({onSelect, onClose}: AlbumPickerProps) => {
    const {albumLibrary, fetchAlbumLibrary, isLoading} = useStore()
    const [searchQuery, setSearchQuery] = useState('')

    // Fetch album library on mount
    useEffect(() => {
        fetchAlbumLibrary()
    }, [fetchAlbumLibrary])

    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchAlbumLibrary(searchQuery)
    }

    // Handle album selection
    const handleAlbumSelect = (albumId: number) => {
        onSelect(albumId)
    }

    const SearchIcon = () => (
        <svg style={{width: '24px', height: '24px'}} viewBox="0 0 24 24">
            <path
                fill="#666666"
                d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
            />
        </svg>
    );


    return (
        <>
            <div className="pauseMask" onClick={onClose}></div>
            <div className="AlbumPicker">
                <Form className="searchBar" onSubmit={handleSearch}>
                    <Form.Control
                        id="searchQueryInput"
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                    <button id="searchQuerySubmit" type="submit" style={{marginLeft: "-3.5rem"}}>
                        <SearchIcon/>
                    </button>


                </Form>

                <Canvas >
                    {albumLibrary && (
                        <AlbumPickerRenderer
                            searchQuery={searchQuery}
                            albumLibrary={albumLibrary}
                            onAlbumSelect={handleAlbumSelect}
                        />
                    )}
                </Canvas>

                {isLoading && (
                    <div id="my-loader" className="ldld full light"></div>
                )}
            </div>
        </>
    )
}

export default AlbumPicker