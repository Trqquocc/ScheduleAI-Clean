def knn_regression(train_data, x_query, k):
    # Tính khoảng cách giữa x_query và từng x trong dữ liệu
    distances = []
    for x, y in train_data:
        dist = abs(x - x_query)
        distances.append((dist, y))
    
    # Sắp xếp theo khoảng cách tăng dần
    distances.sort(key=lambda tup: tup[0])

    # Lấy k điểm gần nhất
    k_nearest_y = [y for _, y in distances[:k]]

    # Dự đoán là trung bình của k điểm gần nhất
    return sum(k_nearest_y) / k


# Dữ liệu giờ học và điểm thi
training_data = [
    (1, 0.),
    (2, 1.0),
    (3, 2.5),
    (4, 4.5),
    (5, 5.5),
    (6, 6.0),
    (7, 7.0),
    (8, 7.5),
    (9, 9.0),
    (10, 9.5)
]

x_query = 8.5
k =3  # Số hàng xóm gần nhất

predicted_score = knn_regression(training_data, x_query, k)
print(f"Dự đoán điểm thi cho {x_query} giờ học (k={k}): {predicted_score:.2f}")
