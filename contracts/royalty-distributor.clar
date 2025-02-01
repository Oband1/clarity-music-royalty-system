;; Define error codes
(define-constant err-unauthorized (err u100))
(define-constant err-invalid-percentage (err u101))
(define-constant err-no-song (err u102))
(define-constant err-already-registered (err u103))
(define-constant err-no-nft (err u104))
(define-constant err-invalid-nft-owner (err u105))

;; Data variables
(define-data-var contract-owner principal tx-sender)

;; Data maps
(define-map songs
    { song-id: uint }
    {
        artist: principal,
        producer: principal,
        label: principal,
        artist-share: uint,
        producer-share: uint,
        label-share: uint,
        total-earnings: uint,
        nft-id: (optional uint)
    }
)

(define-map royalty-payments
    { song-id: uint, recipient: principal }
    { amount: uint }
)

(define-map song-nfts
    { nft-id: uint }
    {
        song-id: uint,
        owner: principal,
        metadata-uri: (string-ascii 256)
    }
)

;; Register a new song with royalty splits
(define-public (register-song 
    (song-id uint)
    (artist principal)
    (producer principal)
    (label principal)
    (artist-share uint)
    (producer-share uint)
    (label-share uint))
    
    (let ((total-share (+ artist-share producer-share label-share)))
        (asserts! (is-eq tx-sender (var-get contract-owner)) err-unauthorized)
        (asserts! (is-eq total-share u100) err-invalid-percentage)
        (asserts! (is-none (map-get? songs {song-id: song-id})) err-already-registered)
        
        (ok (map-set songs
            {song-id: song-id}
            {
                artist: artist,
                producer: producer,
                label: label,
                artist-share: artist-share,
                producer-share: producer-share,
                label-share: label-share,
                total-earnings: u0,
                nft-id: none
            }))
    )
)

;; Mint NFT for a song
(define-public (mint-song-nft 
    (song-id uint) 
    (nft-id uint)
    (metadata-uri (string-ascii 256)))
    
    (let ((song-data (unwrap! (map-get? songs {song-id: song-id}) err-no-song)))
        (asserts! (is-eq tx-sender (get artist song-data)) err-unauthorized)
        (asserts! (is-none (get nft-id song-data)) err-already-registered)
        
        ;; Create NFT record
        (map-set song-nfts
            {nft-id: nft-id}
            {
                song-id: song-id,
                owner: tx-sender,
                metadata-uri: metadata-uri
            }
        )
        
        ;; Update song with NFT reference
        (ok (map-set songs
            {song-id: song-id}
            (merge song-data {nft-id: (some nft-id)})))
    )
)

;; Transfer NFT ownership
(define-public (transfer-nft
    (nft-id uint)
    (recipient principal))
    
    (let ((nft-data (unwrap! (map-get? song-nfts {nft-id: nft-id}) err-no-nft)))
        (asserts! (is-eq tx-sender (get owner nft-data)) err-invalid-nft-owner)
        
        (ok (map-set song-nfts
            {nft-id: nft-id}
            (merge nft-data {owner: recipient})))
    )
)

;; Distribute royalty payment for a song
(define-public (distribute-royalty (song-id uint) (amount uint))
    (let (
        (song-data (unwrap! (map-get? songs {song-id: song-id}) err-no-song))
        (artist-amount (/ (* amount (get artist-share song-data)) u100))
        (producer-amount (/ (* amount (get producer-share song-data)) u100))
        (label-amount (/ (* amount (get label-share song-data)) u100))
    )
        ;; Update total earnings
        (map-set songs {song-id: song-id}
            (merge song-data {total-earnings: (+ amount (get total-earnings song-data))})
        )
        
        ;; Record individual payments
        (map-set royalty-payments 
            {song-id: song-id, recipient: (get artist song-data)} 
            {amount: artist-amount}
        )
        (map-set royalty-payments 
            {song-id: song-id, recipient: (get producer song-data)} 
            {amount: producer-amount}
        )
        (map-set royalty-payments 
            {song-id: song-id, recipient: (get label song-data)} 
            {amount: label-amount}
        )
        
        (ok true)
    )
)

;; Get song details
(define-read-only (get-song-details (song-id uint))
    (ok (map-get? songs {song-id: song-id}))
)

;; Get NFT details
(define-read-only (get-nft-details (nft-id uint))
    (ok (map-get? song-nfts {nft-id: nft-id}))
)

;; Get royalty payment for a recipient
(define-read-only (get-royalty-payment (song-id uint) (recipient principal))
    (ok (map-get? royalty-payments {song-id: song-id, recipient: recipient}))
)
