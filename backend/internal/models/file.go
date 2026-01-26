package models

type File struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	UploadedAt int64  `json:"uploadedAt"`
	CreatedAt  int64  `json:"createdAt"`
	UpdatedAt  int64  `json:"updatedAt"`
}
